import { NextResponse } from 'next/server';
import { initDB, getSQL, isDBAvailable } from '../../../lib/db';

export async function GET(request) {
  if (!isDBAvailable()) return NextResponse.json({ machines: [], records: {}, observations: {} });
  await initDB();
  const sql = getSQL();
  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month');

  const machines = await sql`SELECT * FROM maquinetas ORDER BY id`;
  const allRecords = {};
  const allObs = {};

  for (const m of machines) {
    const recs = await sql`SELECT * FROM maquinetas_records WHERE maquineta_id = ${m.id} AND month_key = ${month} ORDER BY id`;
    allRecords[m.id] = recs.map(r => ({
      id: r.id, data: r.data, nota: r.nota, valor: parseFloat(r.valor)
    }));
    const obs = await sql`SELECT texto FROM maquinetas_obs WHERE maquineta_id = ${m.id} AND month_key = ${month}`;
    allObs[m.id] = obs.length > 0 ? obs[0].texto : '';
  }

  return NextResponse.json({
    machines: machines.map(m => ({ id: m.id, nome: m.nome, maximo: parseFloat(m.maximo) })),
    records: allRecords,
    observations: allObs,
  });
}

export async function POST(request) {
  if (!isDBAvailable()) return NextResponse.json({ error: 'No DB' }, { status: 503 });
  await initDB();
  const sql = getSQL();
  const body = await request.json();
  const { action } = body;

  if (action === 'addMachine') {
    const rows = await sql`INSERT INTO maquinetas (nome, maximo) VALUES (${body.nome || 'Nova Maquineta'}, 0) RETURNING *`;
    return NextResponse.json({ id: rows[0].id, nome: rows[0].nome, maximo: 0 });
  }

  if (action === 'removeMachine') {
    await sql`DELETE FROM maquinetas_records WHERE maquineta_id = ${body.id}`;
    await sql`DELETE FROM maquinetas_obs WHERE maquineta_id = ${body.id}`;
    await sql`DELETE FROM maquinetas WHERE id = ${body.id}`;
    return NextResponse.json({ success: true });
  }

  if (action === 'updateName') {
    await sql`UPDATE maquinetas SET nome = ${body.nome} WHERE id = ${body.id}`;
    return NextResponse.json({ success: true });
  }

  if (action === 'updateMaximo') {
    await sql`UPDATE maquinetas SET maximo = ${body.maximo} WHERE id = ${body.id}`;
    return NextResponse.json({ success: true });
  }

  if (action === 'addRecord') {
    const rows = await sql`
      INSERT INTO maquinetas_records (maquineta_id, month_key, data, nota, valor)
      VALUES (${body.machineId}, ${body.month}, ${body.data}, ${body.nota}, ${body.valor})
      RETURNING *
    `;
    const r = rows[0];
    return NextResponse.json({ id: r.id, data: r.data, nota: r.nota, valor: parseFloat(r.valor) });
  }

  if (action === 'deleteRecord') {
    await sql`DELETE FROM maquinetas_records WHERE id = ${body.id}`;
    return NextResponse.json({ success: true });
  }

  if (action === 'updateObs') {
    await sql`
      INSERT INTO maquinetas_obs (maquineta_id, month_key, texto)
      VALUES (${body.machineId}, ${body.month}, ${body.texto})
      ON CONFLICT (maquineta_id, month_key) DO UPDATE SET texto = ${body.texto}
    `;
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
