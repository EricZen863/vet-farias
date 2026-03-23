import { NextResponse } from 'next/server';
import { initDB, getSQL, isDBAvailable } from '../../../lib/db';

export async function GET(request) {
  if (!isDBAvailable()) return NextResponse.json([]);
  await initDB();
  const sql = getSQL();
  const { searchParams } = new URL(request.url);
  const module = searchParams.get('module');
  const month = searchParams.get('month');
  const labId = searchParams.get('labId');

  if (module === 'lab') {
    if (labId) {
      const rows = await sql`SELECT * FROM lab_records WHERE lab_id = ${parseInt(labId)} AND month_key = ${month} ORDER BY created_at`;
      return NextResponse.json(rows.map(r => ({
        id: r.id, data: r.created_at, coleta: r.coleta,
        precoCusto: parseFloat(r.preco_custo), prazoEntrega: r.prazo_entrega,
        repasse: parseFloat(r.repasse), lucro: parseFloat(r.lucro)
      })));
    }
    const rows = await sql`SELECT lr.*, l.nome as lab_nome FROM lab_records lr LEFT JOIN labs l ON lr.lab_id = l.id WHERE lr.month_key = ${month} ORDER BY lr.created_at`;
    return NextResponse.json(rows.map(r => ({
      id: r.id, data: r.created_at, coleta: r.coleta,
      precoCusto: parseFloat(r.preco_custo), prazoEntrega: r.prazo_entrega,
      repasse: parseFloat(r.repasse), lucro: parseFloat(r.lucro), labNome: r.lab_nome
    })));
  }

  if (module === 'cirurgioes') {
    const rows = await sql`SELECT * FROM cirurgioes_records WHERE month_key = ${month} ORDER BY created_at`;
    return NextResponse.json(rows.map(r => ({
      id: r.id, data: r.created_at, nome: r.nome,
      procedimento: r.procedimento, valor: parseFloat(r.valor)
    })));
  }

  if (module === 'imagem') {
    const rows = await sql`SELECT * FROM imagem_records WHERE month_key = ${month} ORDER BY created_at`;
    return NextResponse.json(rows.map(r => ({
      id: r.id, data: r.created_at, nome: r.nome,
      exame: r.exame, valor: parseFloat(r.valor)
    })));
  }

  if (module === 'gastos') {
    const rows = await sql`SELECT * FROM gastos_records WHERE month_key = ${month} ORDER BY created_at`;
    return NextResponse.json(rows.map(r => ({
      id: r.id, data: r.created_at, descricao: r.descricao, valor: parseFloat(r.valor)
    })));
  }

  return NextResponse.json([]);
}

export async function POST(request) {
  if (!isDBAvailable()) return NextResponse.json({ error: 'No DB' }, { status: 503 });
  await initDB();
  const sql = getSQL();
  const body = await request.json();
  const { module, month } = body;

  if (module === 'lab') {
    const rows = await sql`
      INSERT INTO lab_records (lab_id, month_key, coleta, preco_custo, prazo_entrega, repasse, lucro)
      VALUES (${body.labId}, ${month}, ${body.coleta}, ${body.precoCusto}, ${body.prazoEntrega}, ${body.repasse}, ${body.lucro})
      RETURNING *
    `;
    const r = rows[0];
    return NextResponse.json({
      id: r.id, data: r.created_at, coleta: r.coleta,
      precoCusto: parseFloat(r.preco_custo), prazoEntrega: r.prazo_entrega,
      repasse: parseFloat(r.repasse), lucro: parseFloat(r.lucro)
    });
  }

  if (module === 'cirurgioes') {
    const rows = await sql`
      INSERT INTO cirurgioes_records (month_key, nome, procedimento, valor)
      VALUES (${month}, ${body.nome}, ${body.procedimento}, ${body.valor})
      RETURNING *
    `;
    const r = rows[0];
    return NextResponse.json({
      id: r.id, data: r.created_at, nome: r.nome,
      procedimento: r.procedimento, valor: parseFloat(r.valor)
    });
  }

  if (module === 'imagem') {
    const rows = await sql`
      INSERT INTO imagem_records (month_key, nome, exame, valor)
      VALUES (${month}, ${body.nome}, ${body.exame}, ${body.valor})
      RETURNING *
    `;
    const r = rows[0];
    return NextResponse.json({
      id: r.id, data: r.created_at, nome: r.nome,
      exame: r.exame, valor: parseFloat(r.valor)
    });
  }

  if (module === 'gastos') {
    const rows = await sql`
      INSERT INTO gastos_records (month_key, descricao, valor)
      VALUES (${month}, ${body.descricao}, ${body.valor})
      RETURNING *
    `;
    const r = rows[0];
    return NextResponse.json({
      id: r.id, data: r.created_at, descricao: r.descricao, valor: parseFloat(r.valor)
    });
  }

  return NextResponse.json({ error: 'Invalid module' }, { status: 400 });
}

export async function DELETE(request) {
  if (!isDBAvailable()) return NextResponse.json({ error: 'No DB' }, { status: 503 });
  await initDB();
  const sql = getSQL();
  const { searchParams } = new URL(request.url);
  const module = searchParams.get('module');
  const id = parseInt(searchParams.get('id'));

  if (module === 'lab') await sql`DELETE FROM lab_records WHERE id = ${id}`;
  if (module === 'cirurgioes') await sql`DELETE FROM cirurgioes_records WHERE id = ${id}`;
  if (module === 'imagem') await sql`DELETE FROM imagem_records WHERE id = ${id}`;
  if (module === 'gastos') await sql`DELETE FROM gastos_records WHERE id = ${id}`;

  return NextResponse.json({ success: true });
}
