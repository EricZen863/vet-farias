import { NextResponse } from 'next/server';
import { initDB, initFolhaDePonto, getSQL, isDBAvailable } from '../../../lib/db';

export async function GET() {
  if (!isDBAvailable()) return NextResponse.json([]);
  await initDB();
  await initFolhaDePonto();
  const sql = getSQL();

  const rows = await sql`SELECT id, nome, cpf, profissao, email, carga_horaria_semanal, carga_horaria_contrato, tipo_folha, jornada, ativo, created_at FROM funcionarios ORDER BY nome`;
  return NextResponse.json(rows);
}

export async function POST(request) {
  if (!isDBAvailable()) return NextResponse.json({ error: 'No DB' }, { status: 503 });
  await initDB();
  await initFolhaDePonto();
  const sql = getSQL();
  const body = await request.json();
  const { action } = body;

  if (action === 'create') {
    const { nome, cpf, profissao, email, senha, carga_horaria_semanal, carga_horaria_contrato, tipo_folha, jornada } = body;
    if (!nome || !cpf || !email || !senha) {
      return NextResponse.json({ error: 'Campos obrigatórios: nome, cpf, email, senha' }, { status: 400 });
    }
    try {
      const rows = await sql`
        INSERT INTO funcionarios (nome, cpf, profissao, email, senha, carga_horaria_semanal, carga_horaria_contrato, tipo_folha, jornada)
        VALUES (${nome}, ${cpf}, ${profissao || ''}, ${email}, ${senha}, ${carga_horaria_semanal || 44}, ${carga_horaria_contrato || carga_horaria_semanal || 44}, ${tipo_folha || 'normal'}, ${JSON.stringify(jornada || {})})
        RETURNING id, nome, cpf, profissao, email, carga_horaria_semanal, carga_horaria_contrato, tipo_folha, jornada, ativo
      `;
      return NextResponse.json(rows[0]);
    } catch (err) {
      if (err.message?.includes('unique') || err.message?.includes('duplicate')) {
        return NextResponse.json({ error: 'CPF ou e-mail já cadastrado' }, { status: 409 });
      }
      throw err;
    }
  }

  if (action === 'update') {
    const { id, nome, cpf, profissao, email, senha, carga_horaria_semanal, carga_horaria_contrato, tipo_folha, jornada } = body;
    if (senha) {
      await sql`
        UPDATE funcionarios SET nome=${nome}, cpf=${cpf}, profissao=${profissao || ''}, email=${email}, senha=${senha},
        carga_horaria_semanal=${carga_horaria_semanal || 44}, carga_horaria_contrato=${carga_horaria_contrato || carga_horaria_semanal || 44},
        tipo_folha=${tipo_folha || 'normal'}, jornada=${JSON.stringify(jornada || {})}
        WHERE id=${id}
      `;
    } else {
      await sql`
        UPDATE funcionarios SET nome=${nome}, cpf=${cpf}, profissao=${profissao || ''}, email=${email},
        carga_horaria_semanal=${carga_horaria_semanal || 44}, carga_horaria_contrato=${carga_horaria_contrato || carga_horaria_semanal || 44},
        tipo_folha=${tipo_folha || 'normal'}, jornada=${JSON.stringify(jornada || {})}
        WHERE id=${id}
      `;
    }
    return NextResponse.json({ success: true });
  }

  if (action === 'delete') {
    await sql`DELETE FROM registros_ponto WHERE funcionario_id = ${body.id}`;
    await sql`DELETE FROM funcionarios WHERE id = ${body.id}`;
    return NextResponse.json({ success: true });
  }

  if (action === 'generate_fake_data') {
    const { funcionarioId } = body;
    
    // Fetch employee data
    const funcRows = await sql`SELECT * FROM funcionarios WHERE id = ${funcionarioId}`;
    if (!funcRows.length) return NextResponse.json({ error: 'Funcionário não encontrado' }, { status: 404 });
    const func = funcRows[0];
    
    const tipoFolha = func.tipo_folha || 'normal';
    const jornadaObj = typeof func.jornada === 'string' ? JSON.parse(func.jornada) : (func.jornada || {});
    const cargaContrato = parseInt(func.carga_horaria_contrato || 44);
    const debitoSemanal = 44 - cargaContrato; // e.g. 4h for 40h contract
    
    // Helper to map JS day (0=Sun) to jornada key
    const dayKeys = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
    
    // Generate dates for last 3 weeks (21 days back from today)
    const today = new Date();
    const records = [];
    
    for (let i = 21; i >= 1; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayOfWeek = d.getDay(); // 0=Sun, 6=Sat
      const dayKey = dayKeys[dayOfWeek];
      const jornadaDia = jornadaObj[dayKey];
      
      // Skip days marked as folga in the jornada
      if (jornadaDia === null || jornadaDia === undefined) continue;
      
      // Determine tipo_dia
      let tipoDia = 'normal';
      if (dayOfWeek === 0) tipoDia = 'feriado'; // Sunday = treated as holiday
      if (dayOfWeek === 6) tipoDia = 'normal'; // Saturday = normal work
      
      // Base schedule from jornada
      const entrada = jornadaDia.entrada || '09:00';
      const saidaAlmoco = jornadaDia.saida_almoco || '12:00';
      const voltaAlmoco = jornadaDia.volta_almoco || '13:00';
      let saida = jornadaDia.saida || '18:00';
      
      // Calculate base hours
      const [eh, em] = entrada.split(':').map(Number);
      const [sah, sam] = saidaAlmoco.split(':').map(Number);
      const [vah, vam] = voltaAlmoco.split(':').map(Number);
      const [sh, sm] = saida.split(':').map(Number);
      const baseMinutes = ((sah * 60 + sam) - (eh * 60 + em)) + ((sh * 60 + sm) - (vah * 60 + vam));
      const baseHours = baseMinutes / 60;
      
      // Add realistic variation for overtime simulation
      // For atipica: need some weeks with extras below deficit, some above
      let extraMinutes = 0;
      const weekNum = Math.floor((21 - i) / 7); // 0, 1, 2
      const dayInWeek = (21 - i) % 7;
      
      if (tipoFolha === 'atipica') {
        // Week 0: small extras (total ~2h), below deficit of 4h => NO real overtime
        // Week 1: medium extras (total ~5h), above deficit of 4h => 1h real overtime
        // Week 2: large extras (total ~7h), above deficit => 3h real overtime
        if (weekNum === 0 && dayInWeek % 3 === 0) {
          extraMinutes = 40; // +40min on some days
        } else if (weekNum === 1 && dayInWeek % 2 === 0) {
          extraMinutes = 60; // +1h on alternating days
        } else if (weekNum === 2) {
          extraMinutes = dayInWeek <= 3 ? 90 : 30; // +1.5h first days, +30min rest
        }
      } else {
        // Normal: random small overtime on some days
        if (dayInWeek === 1 || dayInWeek === 3) {
          extraMinutes = [30, 45, 60, 90][weekNum % 4]; // some variation
        }
        if (dayInWeek === 4 && weekNum === 2) {
          extraMinutes = 120; // 2h extra one day
        }
      }
      
      // Apply extra minutes to saida time
      if (extraMinutes > 0) {
        const totalSaidaMin = sh * 60 + sm + extraMinutes;
        const newHour = Math.floor(totalSaidaMin / 60);
        const newMin = totalSaidaMin % 60;
        saida = `${String(newHour).padStart(2, '0')}:${String(newMin).padStart(2, '0')}`;
      }
      
      // Calculate total hours and overtime
      const [fsh, fsm] = saida.split(':').map(Number);
      const totalMinutes = ((sah * 60 + sam) - (eh * 60 + em)) + ((fsh * 60 + fsm) - (vah * 60 + vam));
      const totalHours = totalMinutes / 60;
      const horasExtras = Math.max(0, Math.round((totalHours - baseHours) * 100) / 100);
      
      records.push({
        funcionarioId,
        data: dateStr,
        tipoDia,
        entrada,
        saidaAlmoco,
        voltaAlmoco,
        saida,
        horasExtras
      });
    }
    
    // Insert all records (skip duplicates)
    for (const r of records) {
      try {
        await sql`
          INSERT INTO registros_ponto (funcionario_id, data, tipo_dia, entrada, saida_almoco, volta_almoco, saida, horas_extras)
          VALUES (${r.funcionarioId}, ${r.data}, ${r.tipoDia}, ${r.entrada}, ${r.saidaAlmoco}, ${r.voltaAlmoco}, ${r.saida}, ${r.horasExtras})
          ON CONFLICT (funcionario_id, data) DO NOTHING
        `;
      } catch (e) {
        // Skip duplicates silently
      }
    }
    
    return NextResponse.json({ success: true, recordsGenerated: records.length });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
