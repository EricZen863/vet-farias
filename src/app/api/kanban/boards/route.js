import { NextResponse } from 'next/server';
import { getKanbanBoards, isDBAvailable } from '@/lib/db';

export async function GET() {
  try {
    if (!isDBAvailable()) {
      return NextResponse.json([]);
    }
    const boards = await getKanbanBoards();
    return NextResponse.json(boards);
  } catch (error) {
    console.error('Error fetching kanban boards:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
