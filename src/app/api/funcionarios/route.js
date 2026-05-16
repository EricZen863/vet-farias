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
    
    // Generate dates for the LAST FULL MONTH (1st to last day)
    const today = new Date();
    const lastMonthYear = today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear();
    const lastMonthMonth = today.getMonth() === 0 ? 12 : today.getMonth(); // 1-based month
    const lastDayOfLastMonth = new Date(lastMonthYear, lastMonthMonth, 0).getDate();
    const records = [];
    
    for (let day = 1; day <= lastDayOfLastMonth; day++) {
      const d = new Date(lastMonthYear, lastMonthMonth - 1, day);
      // Format date manually to avoid timezone issues
      const dateStr = `${lastMonthYear}-${String(lastMonthMonth).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      const dayOfWeek = d.getDay();
      const dayKey = dayKeys[dayOfWeek];
      const jornadaDia = jornadaObj[dayKey];
      
      if (jornadaDia === null || jornadaDia === undefined) continue;
      
      let tipoDia = 'normal';
      if (dayOfWeek === 0) tipoDia = 'feriado';
      
      const entrada = jornadaDia.entrada || '09:00';
      const saidaAlmoco = jornadaDia.saida_almoco || '12:00';
      const voltaAlmoco = jornadaDia.volta_almoco || '13:00';
      let saida = jornadaDia.saida || '18:00';
      
      const [eh, em] = entrada.split(':').map(Number);
      const [sah, sam] = saidaAlmoco.split(':').map(Number);
      const [vah, vam] = voltaAlmoco.split(':').map(Number);
      const [sh, sm] = saida.split(':').map(Number);
      const baseMinutes = ((sah * 60 + sam) - (eh * 60 + em)) + ((sh * 60 + sm) - (vah * 60 + vam));
      const baseHours = baseMinutes / 60;
      
      // Week number within the month (0-based): 0,1,2,3
      const weekNum = Math.floor((day - 1) / 7);
      const dayInWeek = (day - 1) % 7;
      let extraMinutes = 0;
      
      if (tipoFolha === 'atipica') {
        // Alternating pattern:
        // Week 0 (1st): Only compensation — total extras ~3h (below 4h debt)
        // Week 1 (2nd): Exceeds debt — total extras ~6h (2h real overtime)
        // Week 2 (3rd): Only compensation — total extras ~2.5h (below 4h debt)
        // Week 3 (4th): Exceeds debt — total extras ~7h (3h real overtime)
        if (weekNum === 0) {
          if (dayInWeek === 1 || dayInWeek === 3) extraMinutes = 45;
          if (dayInWeek === 4) extraMinutes = 30;
        } else if (weekNum === 1) {
          if (dayInWeek === 0 || dayInWeek === 2 || dayInWeek === 4) extraMinutes = 60;
          if (dayInWeek === 1) extraMinutes = 90;
          if (dayInWeek === 3) extraMinutes = 30;
        } else if (weekNum === 2) {
          if (dayInWeek === 2) extraMinutes = 50;
          if (dayInWeek === 4) extraMinutes = 40;
          if (dayInWeek === 0) extraMinutes = 30;
        } else if (weekNum >= 3) {
          if (dayInWeek === 0 || dayInWeek === 1) extraMinutes = 90;
          if (dayInWeek === 2 || dayInWeek === 3) extraMinutes = 60;
          if (dayInWeek === 4) extraMinutes = 40;
        }
      } else {
        // Normal: varied overtime
        if (weekNum === 0 && (dayInWeek === 1 || dayInWeek === 3)) extraMinutes = 30;
        if (weekNum === 1 && (dayInWeek === 0 || dayInWeek === 2)) extraMinutes = 60;
        if (weekNum === 1 && dayInWeek === 4) extraMinutes = 45;
        if (weekNum === 2 && dayInWeek === 1) extraMinutes = 90;
        if (weekNum === 2 && dayInWeek === 3) extraMinutes = 30;
        if (weekNum >= 3 && (dayInWeek === 0 || dayInWeek === 2)) extraMinutes = 60;
        if (weekNum >= 3 && dayInWeek === 4) extraMinutes = 120;
      }
      
      if (extraMinutes > 0) {
        const totalSaidaMin = sh * 60 + sm + extraMinutes;
        const newHour = Math.floor(totalSaidaMin / 60);
        const newMin = totalSaidaMin % 60;
        saida = `${String(newHour).padStart(2, '0')}:${String(newMin).padStart(2, '0')}`;
      }
      
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
    let inserted = 0;
    let errors = [];
    console.log(`[FAKE] Generating ${records.length} records for employee ${funcionarioId}, month: ${lastMonthYear}-${String(lastMonthMonth).padStart(2,'0')}`);
    for (const r of records) {
      try {
        await sql`
          INSERT INTO registros_ponto (funcionario_id, data, tipo_dia, entrada, saida_almoco, volta_almoco, saida, horas_extras)
          VALUES (${r.funcionarioId}, ${r.data}, ${r.tipoDia}, ${r.entrada}, ${r.saidaAlmoco}, ${r.voltaAlmoco}, ${r.saida}, ${r.horasExtras})
          ON CONFLICT (funcionario_id, data) DO NOTHING
        `;
        inserted++;
      } catch (e) {
        console.error(`[FAKE] Error inserting ${r.data}:`, e.message);
        errors.push(`${r.data}: ${e.message}`);
      }
    }
    console.log(`[FAKE] Done: ${inserted}/${records.length} inserted`);
    
    return NextResponse.json({ success: true, recordsGenerated: records.length, inserted, errors: errors.length > 0 ? errors : undefined });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
