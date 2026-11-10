import { NextResponse } from 'next/server';
import { initDB, getSQL, isDBAvailable } from '../../../lib/db';

export async function GET(request) {
  try {
    if (!isDBAvailable()) return NextResponse.json([]);
    await initDB();
    const sql = getSQL();
    const rows = await sql`SELECT id, nome, ativo, catalogo, COALESCE(chave_pix, '') as chave_pix FROM labs ORDER BY id`;
    return NextResponse.json(rows.map(r => ({ ...r, catalogo: r.catalogo || [], chave_pix: r.chave_pix || '' })));
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao carregar laboratórios' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    if (!isDBAvailable()) return NextResponse.json({ error: 'No DB' }, { status: 503 });
    await initDB();
    const sql = getSQL();
    const body = await request.json();
    const { action } = body;

    if (action === 'add') {
      const rows = await sql`
        INSERT INTO labs (nome, ativo, catalogo, chave_pix)
        VALUES (${body.nome || 'Novo Laboratório'}, true, '[]'::jsonb, ${body.chave_pix || ''})
        RETURNING *
      `;
      return NextResponse.json({ ...rows[0], catalogo: rows[0].catalogo || [], chave_pix: rows[0].chave_pix || '' });
    }

    if (action === 'updateName') {
      if (!body.id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });
      await sql`UPDATE labs SET nome = ${body.nome} WHERE id = ${body.id}`;
      return NextResponse.json({ success: true });
    }

    if (action === 'updatePix') {
      if (!body.id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });
      await sql`UPDATE labs SET chave_pix = ${body.chave_pix ?? ''} WHERE id = ${body.id}`;
      return NextResponse.json({ success: true });
    }

    if (action === 'toggle') {
      if (!body.id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });
      await sql`UPDATE labs SET ativo = NOT ativo WHERE id = ${body.id}`;
      return NextResponse.json({ success: true });
    }

    if (action === 'uploadCatalog') {
      if (!body.id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });
      await sql`UPDATE labs SET catalogo = ${JSON.stringify(body.catalogo)}::jsonb WHERE id = ${body.id}`;
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 });
  }
}
