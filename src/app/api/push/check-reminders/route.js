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

    for (const card of pendingCards) {
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

      await db`UPDATE kanban_cards SET lembrete_enviado = true WHERE id = ${card.id}`;
    }

    // 2. Processar Lembretes Diários Recorrentes (reminders_recurring)
    const now = new Date();
    const currentHourMin = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });
    const todayStr = now.toISOString().split('T')[0];
    const currentDayOfWeek = now.getDay();

    const recurringList = await db`
      SELECT r.*, col.id as target_col_id
      FROM reminders_recurring r
      JOIN kanban_columns col ON r.column_id = col.id
      WHERE r.ativo = true
        AND r.horario <= ${currentHourMin}
        AND (r.ultimo_disparo IS NULL OR r.ultimo_disparo < ${todayStr}::date)
    `;

    for (const rec of recurringList) {
      const diasArray = Array.isArray(rec.dias_semana) ? rec.dias_semana : [];
      if (diasArray.length > 0 && !diasArray.includes(currentDayOfWeek)) {
        continue;
      }

      const prioEmoji = rec.prioridade === 'alta' ? '🔴 ALTA' : rec.prioridade === 'baixa' ? '🟢 BAIXA' : '🟡 MÉDIA';

      // Disparar Notificacao Push com Prioridade e Descricao
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
