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

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
