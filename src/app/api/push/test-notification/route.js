import { NextResponse } from 'next/server';
import { getPushSubscriptions, isDBAvailable } from '@/lib/db';
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

export async function POST() {
  try {
    if (!isDBAvailable()) {
      return NextResponse.json({ message: 'DB not available' }, { status: 503 });
    }

    const subs = await getPushSubscriptions();
    if (subs.length === 0) {
      return NextResponse.json({ error: 'Nenhum dispositivo cadastrado para notificações.' }, { status: 400 });
    }

    const payload = JSON.stringify({
      title: '🔔 Teste de Notificação Vet Farias 🐾',
      body: 'Perfeito! Notificações Push ativas e funcionando no seu dispositivo.',
      url: '/kanban',
      tag: 'test-notification'
    });

    let sent = 0;
    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          payload
        );
        sent++;
      } catch (err) {
        console.error('Error sending test push:', err);
      }
    }

    return NextResponse.json({ success: true, sent });
  } catch (error) {
    console.error('Error testing push notification:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
