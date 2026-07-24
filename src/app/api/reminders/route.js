import { NextResponse } from 'next/server';
import { getRemindersRecurring, createReminderRecurring, deleteReminderRecurring, isDBAvailable } from '@/lib/db';

export async function GET() {
  try {
    if (!isDBAvailable()) {
      return NextResponse.json([]);
    }
    const list = await getRemindersRecurring();
    return NextResponse.json(list);
  } catch (error) {
    console.error('Error fetching recurring reminders:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    if (!isDBAvailable()) {
      return NextResponse.json({ message: 'DB not available' }, { status: 503 });
    }
    const body = await request.json();
    const { titulo, descricao, horario, prioridade, dias_semana, board_id, column_id } = body;

    if (!titulo || !horario) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const item = await createReminderRecurring({ titulo, descricao, horario, prioridade, dias_semana, board_id, column_id });
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error('Error creating recurring reminder:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    if (!isDBAvailable()) {
      return NextResponse.json({ message: 'DB not available' }, { status: 503 });
    }
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id parameter is required' }, { status: 400 });
    }

    await deleteReminderRecurring(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting recurring reminder:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
