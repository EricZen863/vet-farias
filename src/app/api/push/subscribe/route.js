import { NextResponse } from 'next/server';
import { savePushSubscription, isDBAvailable } from '@/lib/db';

export async function POST(request) {
  try {
    if (!isDBAvailable()) {
      return NextResponse.json({ message: 'DB not available' }, { status: 503 });
    }

    const body = await request.json();
    const { subscription, userAgent } = body;

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });
    }

    await savePushSubscription({
      endpoint: subscription.endpoint,
      keys: subscription.keys,
      user_agent: userAgent || ''
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving push subscription:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
