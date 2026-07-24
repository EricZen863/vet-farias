import { NextResponse } from 'next/server';
import { createKanbanCard, moveKanbanCard, deleteKanbanCard, isDBAvailable } from '@/lib/db';

export async function POST(request) {
  try {
    if (!isDBAvailable()) {
      return NextResponse.json({ message: 'DB not available' }, { status: 503 });
    }
    const body = await request.json();
    const { column_id, titulo, descricao, prioridade, dues_at, etiquetas } = body;

    if (!column_id || !titulo) {
      return NextResponse.json({ error: 'column_id and titulo are required' }, { status: 400 });
    }

    const card = await createKanbanCard({ column_id, titulo, descricao, prioridade, dues_at, etiquetas });
    return NextResponse.json(card, { status: 201 });
  } catch (error) {
    console.error('Error creating kanban card:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    if (!isDBAvailable()) {
      return NextResponse.json({ message: 'DB not available' }, { status: 503 });
    }
    const body = await request.json();
    const { card_id, new_column_id } = body;

    if (!card_id || !new_column_id) {
      return NextResponse.json({ error: 'card_id and new_column_id are required' }, { status: 400 });
    }

    const card = await moveKanbanCard(card_id, new_column_id);
    return NextResponse.json(card);
  } catch (error) {
    console.error('Error moving kanban card:', error);
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

    await deleteKanbanCard(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting kanban card:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
