import { NextResponse } from 'next/server';
import { initDB, initFolhaDePonto, getSQL, isDBAvailable } from '../../../lib/db';

export async function GET(request) {
  if (!isDBAvailable()) return NextResponse.json({ records: [] });
  await initDB();
  await initFolhaDePonto();
  const sql = getSQL();
  const { searchParams } = new URL(request.url);
  const funcionarioId = searchParams.get('funcionarioId');
  const mes = searchParams.get('mes'); // FORMAT: YYYY-MM
  const data = searchParams.get('data'); // FORMAT: YYYY-MM-DD
  const relatorioMes = searchParams.get('relatorioMes');

  if (data && funcionarioId) {
    const rows = await sql`SELECT * FROM registros_ponto WHERE funcionario_id = ${funcionarioId} AND TO_CHAR(data, 'YYYY-MM-DD') = ${data}`;
    return NextResponse.json(rows.length > 0 ? rows[0] : null);
  }

  if (mes && funcionarioId) {
    const rows = await sql`
      SELECT * FROM registros_ponto 
      WHERE funcionario_id = ${funcionarioId} AND TO_CHAR(data, 'YYYY-MM') = ${mes}
      ORDER BY data
    `;
    return NextResponse.json(rows);
  }
  
  if (relatorioMes) {
    // Return all records for all users in a specific month
    const rows = await sql`
      SELECT rp.*, f.nome, f.cpf, f.profissao 
      FROM registros_ponto rp
      JOIN funcionarios f ON rp.funcionario_id = f.id
      WHERE TO_CHAR(rp.data, 'YYYY-MM') = ${relatorioMes}
      ORDER BY f.nome, rp.data
    `;
    return NextResponse.json(rows);
  }

  return NextResponse.json([]);
}

export async function POST(request) {
  if (!isDBAvailable()) return NextResponse.json({ error: 'No DB' }, { status: 503 });
  await initDB();
  await initFolhaDePonto();
  const sql = getSQL();
  const body = await request.json();
  const { action } = body;

  if (action === 'iniciarDia') {
    const { funcionarioId, data, tipoDia } = body;
    const rows = await sql`
      INSERT INTO registros_ponto (funcionario_id, data, tipo_dia)
      VALUES (${funcionarioId}, ${data}, ${tipoDia})
      ON CONFLICT (funcionario_id, data) DO UPDATE SET tipo_dia = ${tipoDia}
      RETURNING *
    `;
    return NextResponse.json(rows[0]);
  }

  if (action === 'registrar') {
    const { funcionarioId, data, campo, valor } = body;
    // campo is one of: entrada, saida_almoco, volta_almoco, saida
    const validCampos = ['entrada', 'saida_almoco', 'volta_almoco', 'saida'];
    if (!validCampos.includes(campo)) {
      return NextResponse.json({ error: 'Campo inválido' }, { status: 400 });
    }

    if (campo === 'entrada') {
      await sql`UPDATE registros_ponto SET entrada = ${valor} WHERE funcionario_id = ${funcionarioId} AND TO_CHAR(data, 'YYYY-MM-DD') = ${data}`;
    } else if (campo === 'saida_almoco') {
      await sql`UPDATE registros_ponto SET saida_almoco = ${valor} WHERE funcionario_id = ${funcionarioId} AND TO_CHAR(data, 'YYYY-MM-DD') = ${data}`;
    } else if (campo === 'volta_almoco') {
      await sql`UPDATE registros_ponto SET volta_almoco = ${valor} WHERE funcionario_id = ${funcionarioId} AND TO_CHAR(data, 'YYYY-MM-DD') = ${data}`;
    } else if (campo === 'saida') {
      // Calculate horas extras
      const funcRows = await sql`SELECT jornada FROM funcionarios WHERE id = ${funcionarioId}`;
      const registro = await sql`SELECT * FROM registros_ponto WHERE funcionario_id = ${funcionarioId} AND TO_CHAR(data, 'YYYY-MM-DD') = ${data}`;
      let horasExtras = 0;

      if (funcRows.length > 0 && registro.length > 0) {
        const jornada = typeof funcRows[0].jornada === 'string' ? JSON.parse(funcRows[0].jornada) : funcRows[0].jornada;
        const reg = registro[0];
        const diasSemana = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
        // Parse date considering timezone issues. Let's just create a Date object correctly
        const [year, month, day] = data.split('-');
        const dayIndex = new Date(year, month - 1, day).getDay();
        const diaKey = diasSemana[dayIndex];
        const jornadaDia = jornada[diaKey];

        if (reg.tipo_dia === 'feriado' || reg.tipo_dia === 'folga') {
          // All hours worked count as extra
          if (reg.entrada && valor) {
            const entradaMin = timeToMinutes(reg.entrada);
            const saidaMin = timeToMinutes(valor);
            const almocoMin = (reg.saida_almoco && reg.volta_almoco)
              ? timeToMinutes(reg.volta_almoco) - timeToMinutes(reg.saida_almoco) : 0;
            horasExtras = Math.max(0, (saidaMin - entradaMin - almocoMin) / 60);
          }
        } else if (jornadaDia && jornadaDia.saida) {
          // Normal day — compare actual saida with expected saida
          const saidaEsperada = timeToMinutes(jornadaDia.saida);
          const saidaReal = timeToMinutes(valor);
          if (saidaReal > saidaEsperada) {
            horasExtras = (saidaReal - saidaEsperada) / 60;
          }
        }
      }

      horasExtras = Math.round(horasExtras * 100) / 100;
      await sql`UPDATE registros_ponto SET saida = ${valor}, horas_extras = ${horasExtras} WHERE funcionario_id = ${funcionarioId} AND TO_CHAR(data, 'YYYY-MM-DD') = ${data}`;
    }

    const updated = await sql`SELECT * FROM registros_ponto WHERE funcionario_id = ${funcionarioId} AND TO_CHAR(data, 'YYYY-MM-DD') = ${data}`;
    return NextResponse.json(updated[0]);
  }

  if (action === 'editar') {
    const { id, tipo_dia, entrada, saida_almoco, volta_almoco, saida, horas_extras, observacao } = body;
    await sql`
      UPDATE registros_ponto SET
        tipo_dia = ${tipo_dia || 'normal'},
        entrada = ${entrada || null},
        saida_almoco = ${saida_almoco || null},
        volta_almoco = ${volta_almoco || null},
        saida = ${saida || null},
        horas_extras = ${horas_extras || 0},
        observacao = ${observacao || null}
      WHERE id = ${id}
    `;
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}

function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const clean = timeStr.substring(0, 5); // HH:MM
  const [h, m] = clean.split(':').map(Number);
  return h * 60 + m;
}
