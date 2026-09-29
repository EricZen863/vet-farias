import { NextResponse } from 'next/server';
import { getSQL, isDBAvailable, getPushSubscriptions, createKanbanCard } from '@/lib/db';
import { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY } from '@/lib/vapidKeys';
import webpush from 'web-push';

try {
  webpush.setVapidDetails(
    'mailto:suporte@vetfarias.com.br',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
} catch (e) {
  console.error('VAPID setup error:', e);
}

export async function GET() {
  return handleCheck();
}

export async function POST() {
  return handleCheck();
}

async function handleCheck() {
  try {
    if (!isDBAvailable()) {
      return NextResponse.json({ message: 'DB not available' });
    }

    const db = getSQL();
    const subs = await getPushSubscriptions();
    let notificationsSent = 0;

    // 1. Processar Lembretes Avulsos Vencidos (kanban_cards)
    const pendingCards = await db`
      SELECT c.*, col.nome as coluna_nome, b.nome as board_nome
      FROM kanban_cards c
      JOIN kanban_columns col ON c.column_id = col.id
      JOIN kanban_boards b ON col.board_id = b.id
      WHERE c.dues_at IS NOT NULL
        AND c.dues_at <= NOW()
        AND c.lembrete_enviado = false
    `;

    const nowTimestamp = Date.now();

    for (const card of pendingCards) {
      const cardDueTimestamp = new Date(card.dues_at).getTime();
      const diffMinutes = (nowTimestamp - cardDueTimestamp) / (1000 * 60);

      // SÓ dispara se estiver dentro da janela recente de até 15 minutos do horário agendado
      // Se tiver passado há mais de 15 minutos (ex: site ficou fechado), apenas marca como enviado sem apitar atrasado
      const withinWindow = diffMinutes >= 0 && diffMinutes <= 15;

      if (withinWindow && subs.length > 0) {
        const payload = JSON.stringify({
          title: `⏰ Lembrete: ${card.titulo}`,
          body: `${card.coluna_nome}: ${card.descricao || 'Hora do seu compromisso/tarefa!'}`,
          url: '/kanban',
          tag: `card-${card.id}`
        });

        for (const sub of subs) {
          try {
            await webpush.sendNotification(
              { endpoint: sub.endpoint, keys: sub.keys },
              payload
            );
            notificationsSent++;
          } catch (err) {
            if (err.statusCode === 410 || err.statusCode === 404) {
              await db`DELETE FROM push_subscriptions WHERE endpoint = ${sub.endpoint}`;
            }
          }
        }
      }

      await db`UPDATE kanban_cards SET lembrete_enviado = true WHERE id = ${card.id}`;
    }

    // 2. Processar Lembretes Diários Recorrentes (reminders_recurring)
    const nowBr = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    const currentHour = nowBr.getHours();
    const currentMinute = nowBr.getMinutes();
    const currentTotalMin = currentHour * 60 + currentMinute;
    const todayStr = nowBr.toISOString().split('T')[0];
    const currentDayOfWeek = nowBr.getDay();

    const recurringList = await db`
      SELECT r.*, col.id as target_col_id
      FROM reminders_recurring r
      JOIN kanban_columns col ON r.column_id = col.id
      WHERE r.ativo = true
        AND (r.ultimo_disparo IS NULL OR r.ultimo_disparo < ${todayStr}::date)
    `;

    for (const rec of recurringList) {
      const diasArray = Array.isArray(rec.dias_semana) ? rec.dias_semana : [];
      if (diasArray.length > 0 && !diasArray.includes(currentDayOfWeek)) {
        continue;
      }

      const [recH, recM] = (rec.horario || '00:00').split(':').map(Number);
      const recTotalMin = recH * 60 + recM;
      const diffMin = currentTotalMin - recTotalMin;

      // Se ainda NÃO chegou o horário agendado de hoje:
      if (diffMin < 0) {
        continue; // Aguarda chegar a hora
      }

      // SÓ dispara o push se estiver dentro da janela de tolerância de até 10 minutos após o horário exato
      // Exemplo: se foi agendado para 09:30, só dispara entre 09:30 e 09:40
      const withinWindow = diffMin >= 0 && diffMin <= 10;

      if (withinWindow && subs.length > 0) {
        const prioEmoji = rec.prioridade === 'alta' ? '🔴 ALTA' : rec.prioridade === 'baixa' ? '🟢 BAIXA' : '🟡 MÉDIA';

        const payload = JSON.stringify({
          title: `⏰ [${prioEmoji}] ${rec.titulo}`,
          body: rec.descricao ? `${rec.descricao}` : 'Hora de realizar a sua tarefa agendada!',
          url: '/kanban',
          tag: `recurring-${rec.id}`
        });

        for (const sub of subs) {
          try {
            await webpush.sendNotification(
              { endpoint: sub.endpoint, keys: sub.keys },
              payload
            );
            notificationsSent++;
          } catch (err) {
            if (err.statusCode === 410 || err.statusCode === 404) {
              await db`DELETE FROM push_subscriptions WHERE endpoint = ${sub.endpoint}`;
            }
          }
        }
      }

      // Quer tenha disparado (dentro da janela) ou já tenha expirado há muito tempo hoje,
      // atualiza ultimo_disparo = HOJE para nunca mais disparar em horários aleatórios do dia
      await db`UPDATE reminders_recurring SET ultimo_disparo = ${todayStr}::date WHERE id = ${rec.id}`;
    }

    return NextResponse.json({
      success: true,
      pendingCardsProcessed: pendingCards.length,
      recurringProcessed: recurringList.length,
      notificationsSent
    });
  } catch (error) {
    console.error('Error checking reminders:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
