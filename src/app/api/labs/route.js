import { NextResponse } from 'next/server';
import { initDB, getSQL, isDBAvailable } from '../../../lib/db';

export async function GET(request) {
  if (!isDBAvailable()) return NextResponse.json([]);
  await initDB();
  const sql = getSQL();
  const rows = await sql`SELECT id, nome, ativo, catalogo FROM labs ORDER BY id`;
  return NextResponse.json(rows.map(r => ({ ...r, catalogo: r.catalogo || [] })));
}

export async function POST(request) {
  if (!isDBAvailable()) return NextResponse.json({ error: 'No DB' }, { status: 503 });
  await initDB();
  const sql = getSQL();
  const body = await request.json();
  const { action } = body;

  if (action === 'add') {
    const rows = await sql`INSERT INTO labs (nome, ativo, catalogo) VALUES (${body.nome || 'Novo Laboratório'}, true, '[]'::jsonb) RETURNING *`;
    return NextResponse.json(rows[0]);
  }

  if (action === 'updateName') {
    await sql`UPDATE labs SET nome = ${body.nome} WHERE id = ${body.id}`;
    return NextResponse.json({ success: true });
  }

  if (action === 'toggle') {
    await sql`UPDATE labs SET ativo = NOT ativo WHERE id = ${body.id}`;
    return NextResponse.json({ success: true });
  }

  if (action === 'uploadCatalog') {
    await sql`UPDATE labs SET catalogo = ${JSON.stringify(body.catalogo)}::jsonb WHERE id = ${body.id}`;
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
