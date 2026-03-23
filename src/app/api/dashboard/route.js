import { NextResponse } from 'next/server';
import { initDB, getSQL, isDBAvailable } from '../../../lib/db';

export async function GET(request) {
  if (!isDBAvailable()) {
    return NextResponse.json({ labTotal: 0, cirurgioesTotal: 0, imagemTotal: 0, gastosTotal: 0, maquinetasTotal: 0 });
  }
  await initDB();
  const sql = getSQL();
  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month');

  const labRows = await sql`SELECT COALESCE(SUM(preco_custo), 0) as total FROM lab_records WHERE month_key = ${month}`;
  const cirRows = await sql`SELECT COALESCE(SUM(valor), 0) as total FROM cirurgioes_records WHERE month_key = ${month}`;
  const imgRows = await sql`SELECT COALESCE(SUM(valor), 0) as total FROM imagem_records WHERE month_key = ${month}`;
  const gasRows = await sql`SELECT COALESCE(SUM(valor), 0) as total FROM gastos_records WHERE month_key = ${month}`;
  const maqRows = await sql`SELECT COALESCE(SUM(valor), 0) as total FROM maquinetas_records WHERE month_key = ${month}`;

  return NextResponse.json({
    labTotal: parseFloat(labRows[0].total),
    cirurgioesTotal: parseFloat(cirRows[0].total),
    imagemTotal: parseFloat(imgRows[0].total),
    gastosTotal: parseFloat(gasRows[0].total),
    maquinetasTotal: parseFloat(maqRows[0].total),
  });
}
