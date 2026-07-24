import { NextResponse } from 'next/server';
import { getKanbanBoards, initDB, isDBAvailable, getSQL } from '@/lib/db';

export async function GET() {
  try {
    if (!isDBAvailable()) {
      return NextResponse.json([]);
    }

    await initDB();
    const boards = await getKanbanBoards();
    return NextResponse.json(boards);
  } catch (error) {
    console.error('Error fetching kanban boards:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    if (!isDBAvailable()) {
      return NextResponse.json({ message: 'DB not available' }, { status: 503 });
    }

    const { nome } = await request.json();
    if (!nome) {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 });
    }

    const db = getSQL();
    const res = await db`INSERT INTO kanban_boards (nome, cor) VALUES (${nome}, '#8c69ac') RETURNING id`;
    const bId = res[0].id;
    await db`INSERT INTO kanban_columns (board_id, nome, ordem) VALUES (${bId}, 'A Fazer', 1)`;
    await db`INSERT INTO kanban_columns (board_id, nome, ordem) VALUES (${bId}, 'Em Andamento', 2)`;
    await db`INSERT INTO kanban_columns (board_id, nome, ordem) VALUES (${bId}, 'Concluído', 3)`;

    const boards = await getKanbanBoards();
    return NextResponse.json(boards, { status: 201 });
  } catch (error) {
    console.error('Error creating kanban board:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
