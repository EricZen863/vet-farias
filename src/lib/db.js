import { neon } from '@neondatabase/serverless';

let sql = null;
let dbInitialized = false;

function getSQL() {
  if (!sql && process.env.DATABASE_URL) {
    sql = neon(process.env.DATABASE_URL);
  }
  return sql;
}

export function isDBAvailable() {
  return !!process.env.DATABASE_URL;
}

export async function initDB() {
  if (dbInitialized) return;
  const db = getSQL();
  if (!db) return;

  await db`
    CREATE TABLE IF NOT EXISTS credentials (
      id SERIAL PRIMARY KEY,
      username VARCHAR(100) NOT NULL DEFAULT 'admin',
      password VARCHAR(200) NOT NULL DEFAULT 'vetfarias2024'
    )
  `;

  await db`
    INSERT INTO credentials (username, password)
    SELECT 'admin', 'vetfarias2024'
    WHERE NOT EXISTS (SELECT 1 FROM credentials)
  `;

  await db`
    CREATE TABLE IF NOT EXISTS labs (
      id SERIAL PRIMARY KEY,
      nome VARCHAR(200) NOT NULL DEFAULT 'Laboratório 1',
      ativo BOOLEAN NOT NULL DEFAULT true,
      catalogo JSONB DEFAULT '[]'
    )
  `;

  await db`
    INSERT INTO labs (nome, ativo, catalogo)
    SELECT 'Laboratório 1', true, '[]'::jsonb
    WHERE NOT EXISTS (SELECT 1 FROM labs)
  `;

  await db`
    CREATE TABLE IF NOT EXISTS lab_records (
      id SERIAL PRIMARY KEY,
      lab_id INTEGER NOT NULL,
      month_key VARCHAR(7) NOT NULL,
      coleta VARCHAR(300),
      preco_custo DECIMAL(10,2) DEFAULT 0,
      prazo_entrega VARCHAR(100),
      repasse DECIMAL(10,2) DEFAULT 0,
      lucro DECIMAL(10,2) DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await db`
    CREATE TABLE IF NOT EXISTS cirurgioes_records (
      id SERIAL PRIMARY KEY,
      month_key VARCHAR(7) NOT NULL,
      nome VARCHAR(200) NOT NULL,
      procedimento VARCHAR(300),
      valor DECIMAL(10,2) DEFAULT 0,
      status VARCHAR(10) DEFAULT 'FALTA',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await db`ALTER TABLE cirurgioes_records ADD COLUMN IF NOT EXISTS status VARCHAR(10) DEFAULT 'FALTA'`;

  await db`
    CREATE TABLE IF NOT EXISTS imagem_records (
      id SERIAL PRIMARY KEY,
      month_key VARCHAR(7) NOT NULL,
      nome VARCHAR(200) NOT NULL,
      exame VARCHAR(300),
      valor DECIMAL(10,2) DEFAULT 0,
      status VARCHAR(10) DEFAULT 'FALTA',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await db`ALTER TABLE imagem_records ADD COLUMN IF NOT EXISTS status VARCHAR(10) DEFAULT 'FALTA'`;

  await db`
    CREATE TABLE IF NOT EXISTS gastos_records (
      id SERIAL PRIMARY KEY,
      month_key VARCHAR(7) NOT NULL,
      descricao VARCHAR(500),
      valor DECIMAL(10,2) DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await db`
    CREATE TABLE IF NOT EXISTS maquinetas (
      id SERIAL PRIMARY KEY,
      nome VARCHAR(200) NOT NULL DEFAULT 'Maquineta 1',
      maximo DECIMAL(10,2) DEFAULT 0
    )
  `;

  const existingMachines = await db`SELECT COUNT(*) as count FROM maquinetas`;
  if (parseInt(existingMachines[0].count) === 0) {
    await db`INSERT INTO maquinetas (nome, maximo) VALUES ('Maquineta 1', 0)`;
    await db`INSERT INTO maquinetas (nome, maximo) VALUES ('Maquineta 2', 0)`;
    await db`INSERT INTO maquinetas (nome, maximo) VALUES ('Maquineta 3', 0)`;
  }

  await db`
    CREATE TABLE IF NOT EXISTS maquinetas_records (
      id SERIAL PRIMARY KEY,
      maquineta_id INTEGER NOT NULL,
      month_key VARCHAR(7) NOT NULL,
      data VARCHAR(20),
      nota VARCHAR(10) DEFAULT 'N/A',
      valor DECIMAL(10,2) DEFAULT 0,
      valor_produto DECIMAL(10,2) DEFAULT 0
    )
  `;

  // Add valor_produto column if missing (existing DBs)
  try {
    await db`ALTER TABLE maquinetas_records ADD COLUMN IF NOT EXISTS valor_produto DECIMAL(10,2) DEFAULT 0`;
  } catch (e) { /* column already exists */ }

  await db`
    CREATE TABLE IF NOT EXISTS maquinetas_obs (
      id SERIAL PRIMARY KEY,
      maquineta_id INTEGER NOT NULL,
      month_key VARCHAR(7) NOT NULL,
      texto TEXT DEFAULT '',
      UNIQUE(maquineta_id, month_key)
    )
  `;

  // Cleanup: remove duplicate maquinetas (keep only the ones with the lowest id per name)
  await db`
    DELETE FROM maquinetas WHERE id NOT IN (
      SELECT MIN(id) FROM maquinetas GROUP BY nome
    ) AND id NOT IN (
      SELECT DISTINCT maquineta_id FROM maquinetas_records
    )
  `;

  dbInitialized = true;
}

// Separate init for folha de ponto — always runs to ensure tables exist
let folhaInitialized = false;
export async function initFolhaDePonto() {
  if (folhaInitialized) return;
  const db = getSQL();
  if (!db) return;

  await db`
    CREATE TABLE IF NOT EXISTS funcionarios (
      id SERIAL PRIMARY KEY,
      nome VARCHAR(200) NOT NULL,
      cpf VARCHAR(14) NOT NULL UNIQUE,
      profissao VARCHAR(200),
      email VARCHAR(200) NOT NULL UNIQUE,
      senha VARCHAR(200) NOT NULL,
      carga_horaria_semanal INTEGER DEFAULT 44,
      carga_horaria_contrato INTEGER DEFAULT 44,
      tipo_folha VARCHAR(20) DEFAULT 'normal',
      jornada JSONB DEFAULT '{}',
      ativo BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  // Add columns if they don't exist (for existing databases)
  await db`ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS tipo_folha VARCHAR(20) DEFAULT 'normal'`;
  await db`ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS carga_horaria_contrato INTEGER DEFAULT 44`;

  await db`
    CREATE TABLE IF NOT EXISTS registros_ponto (
      id SERIAL PRIMARY KEY,
      funcionario_id INTEGER NOT NULL REFERENCES funcionarios(id) ON DELETE CASCADE,
      data DATE NOT NULL,
      tipo_dia VARCHAR(20) DEFAULT 'normal',
      entrada TIME,
      saida_almoco TIME,
      volta_almoco TIME,
      saida TIME,
      horas_extras DECIMAL(5,2) DEFAULT 0,
      observacao TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(funcionario_id, data)
    )
  `;

  await initKanbanAndRemindersDB(db);
  await initChecklistDB(db);

  folhaInitialized = true;
}

async function initKanbanAndRemindersDB(db) {
  await db`
    CREATE TABLE IF NOT EXISTS kanban_boards (
      id SERIAL PRIMARY KEY,
      nome VARCHAR(100) NOT NULL,
      cor VARCHAR(20) DEFAULT '#8c69ac',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await db`
    CREATE TABLE IF NOT EXISTS kanban_columns (
      id SERIAL PRIMARY KEY,
      board_id INTEGER REFERENCES kanban_boards(id) ON DELETE CASCADE,
      nome VARCHAR(100) NOT NULL,
      ordem INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await db`
    CREATE TABLE IF NOT EXISTS kanban_cards (
      id SERIAL PRIMARY KEY,
      column_id INTEGER REFERENCES kanban_columns(id) ON DELETE CASCADE,
      titulo VARCHAR(250) NOT NULL,
      descricao TEXT,
      prioridade VARCHAR(20) DEFAULT 'media',
      dues_at TIMESTAMP,
      lembrete_enviado BOOLEAN DEFAULT false,
      etiquetas JSONB DEFAULT '[]',
      ordem INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await db`
    CREATE TABLE IF NOT EXISTS reminders_recurring (
      id SERIAL PRIMARY KEY,
      titulo VARCHAR(250) NOT NULL,
      descricao TEXT,
      horario VARCHAR(5) NOT NULL,
      prioridade VARCHAR(20) DEFAULT 'media',
      dias_semana JSONB DEFAULT '[0,1,2,3,4,5,6]',
      board_id INTEGER REFERENCES kanban_boards(id) ON DELETE CASCADE,
      column_id INTEGER REFERENCES kanban_columns(id) ON DELETE CASCADE,
      ativo BOOLEAN DEFAULT true,
      ultimo_disparo DATE,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  // Garantir que colunas recentes existam em bancos existentes
  await db`ALTER TABLE reminders_recurring ADD COLUMN IF NOT EXISTS prioridade VARCHAR(20) DEFAULT 'media'`;

  await db`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id SERIAL PRIMARY KEY,
      endpoint TEXT UNIQUE NOT NULL,
      keys JSONB NOT NULL,
      user_agent TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  // Seed default boards if empty
  const boardsCount = await db`SELECT count(*) as count FROM kanban_boards`;
  if (parseInt(boardsCount[0].count) === 0) {
    const defaultBoards = ['Recepção', 'Clínica', 'Cirurgias', 'Geral'];
    for (const bNome of defaultBoards) {
      const res = await db`INSERT INTO kanban_boards (nome, cor) VALUES (${bNome}, '#8c69ac') RETURNING id`;
      const bId = res[0].id;
      await db`INSERT INTO kanban_columns (board_id, nome, ordem) VALUES (${bId}, 'A Fazer', 1)`;
      await db`INSERT INTO kanban_columns (board_id, nome, ordem) VALUES (${bId}, 'Em Andamento', 2)`;
      await db`INSERT INTO kanban_columns (board_id, nome, ordem) VALUES (${bId}, 'Concluído', 3)`;
    }
  }
}

export async function getKanbanBoards() {
  const db = getSQL();
  if (!db) return [];

  let boards = await db`SELECT * FROM kanban_boards ORDER BY id ASC LIMIT 1`;

  if (boards.length === 0) {
    const res = await db`INSERT INTO kanban_boards (nome, cor) VALUES ('Geral', '#8c69ac') RETURNING id`;
    const bId = res[0].id;
    await db`INSERT INTO kanban_columns (board_id, nome, ordem) VALUES (${bId}, 'A Fazer', 1)`;
    await db`INSERT INTO kanban_columns (board_id, nome, ordem) VALUES (${bId}, 'Em Andamento', 2)`;
    await db`INSERT INTO kanban_columns (board_id, nome, ordem) VALUES (${bId}, 'Concluído', 3)`;
    boards = await db`SELECT * FROM kanban_boards ORDER BY id ASC LIMIT 1`;
  }

  const columns = await db`SELECT * FROM kanban_columns WHERE board_id = ${boards[0].id} ORDER BY ordem ASC`;
  const cards = await db`SELECT * FROM kanban_cards ORDER BY ordem ASC, id DESC`;

  return boards.map(board => ({
    ...board,
    columns: columns.map(col => ({
      ...col,
      cards: cards.filter(card => card.column_id === col.id)
    }))
  }));
}

export async function createKanbanCard({ column_id, titulo, descricao, prioridade, dues_at, etiquetas }) {
  const db = getSQL();
  if (!db) return null;
  const res = await db`
    INSERT INTO kanban_cards (column_id, titulo, descricao, prioridade, dues_at, etiquetas)
    VALUES (${column_id}, ${titulo}, ${descricao || ''}, ${prioridade || 'media'}, ${dues_at || null}, ${JSON.stringify(etiquetas || [])})
    RETURNING *
  `;
  return res[0];
}

export async function moveKanbanCard(card_id, new_column_id) {
  const db = getSQL();
  if (!db) return null;
  const res = await db`
    UPDATE kanban_cards
    SET column_id = ${new_column_id}
    WHERE id = ${card_id}
    RETURNING *
  `;
  return res[0];
}

export async function deleteKanbanCard(card_id) {
  const db = getSQL();
  if (!db) return false;
  await db`DELETE FROM kanban_cards WHERE id = ${card_id}`;
  return true;
}

export async function getRemindersRecurring() {
  const db = getSQL();
  if (!db) return [];
  return await db`SELECT * FROM reminders_recurring ORDER BY horario ASC`;
}

export async function createReminderRecurring({ titulo, descricao, horario, prioridade, dias_semana, board_id, column_id }) {
  const db = getSQL();
  if (!db) return null;

  let targetBoardId = board_id;
  let targetColumnId = column_id;

  if (!targetBoardId || !targetColumnId) {
    const boards = await db`SELECT id FROM kanban_boards ORDER BY id ASC LIMIT 1`;
    if (boards.length > 0) {
      targetBoardId = boards[0].id;
      const cols = await db`SELECT id FROM kanban_columns WHERE board_id = ${targetBoardId} ORDER BY ordem ASC LIMIT 1`;
      if (cols.length > 0) {
        targetColumnId = cols[0].id;
      }
    }
  }

  // Obter hora e data atual no Fuso de Brasilia (America/Sao_Paulo)
  const nowBr = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  const brHourMin = nowBr.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });
  const brTodayStr = nowBr.toISOString().split('T')[0];

  // Se o horario agendado ja passou no dia de hoje em Brasilia, marcar ultimo_disparo = HOJE para disparar so amanha
  const ultimoDisparo = (horario <= brHourMin) ? brTodayStr : null;

  const res = await db`
    INSERT INTO reminders_recurring (titulo, descricao, horario, prioridade, dias_semana, board_id, column_id, ultimo_disparo)
    VALUES (${titulo}, ${descricao || ''}, ${horario}, ${prioridade || 'media'}, ${JSON.stringify(dias_semana || [0,1,2,3,4,5,6])}, ${targetBoardId || null}, ${targetColumnId || null}, ${ultimoDisparo})
    RETURNING *
  `;
  return res[0];
}

export async function deleteReminderRecurring(id) {
  const db = getSQL();
  if (!db) return false;
  await db`DELETE FROM reminders_recurring WHERE id = ${id}`;
  return true;
}

export async function savePushSubscription({ endpoint, keys, user_agent }) {
  const db = getSQL();
  if (!db) return null;
  const res = await db`
    INSERT INTO push_subscriptions (endpoint, keys, user_agent)
    VALUES (${endpoint}, ${JSON.stringify(keys)}, ${user_agent || ''})
    ON CONFLICT (endpoint) DO UPDATE SET keys = ${JSON.stringify(keys)}
    RETURNING *
  `;
  return res[0];
}

export async function getPushSubscriptions() {
  const db = getSQL();
  if (!db) return [];
  return await db`SELECT * FROM push_subscriptions`;
}

async function initChecklistDB(db) {
  await db`
    CREATE TABLE IF NOT EXISTS checklist_templates (
      id SERIAL PRIMARY KEY,
      titulo VARCHAR(250) NOT NULL,
      descricao TEXT,
      periodo VARCHAR(50) DEFAULT 'manha',
      ordem INTEGER DEFAULT 0,
      ativo BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await db`
    CREATE TABLE IF NOT EXISTS checklist_logs (
      id SERIAL PRIMARY KEY,
      template_id INTEGER REFERENCES checklist_templates(id) ON DELETE CASCADE,
      data DATE NOT NULL,
      concluido BOOLEAN DEFAULT false,
      concluido_em TIMESTAMP,
      concluido_por VARCHAR(100),
      observacao TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(template_id, data)
    )
  `;

  // Controle para o seed NUNCA rodar mais de uma vez
  await db`
    CREATE TABLE IF NOT EXISTS checklist_seed_control (
      id SERIAL PRIMARY KEY,
      seeded BOOLEAN DEFAULT true
    )
  `;

  const seedControl = await db`SELECT count(*) as count FROM checklist_seed_control`;
  if (parseInt(seedControl[0].count) === 0) {
    await db`INSERT INTO checklist_seed_control (seeded) VALUES (true)`;

    const countRes = await db`SELECT count(*) as count FROM checklist_templates`;
    if (parseInt(countRes[0].count) === 0) {
      const defaults = [
        { titulo: 'Conferir temperatura da geladeira de vacinas e medicamentos', periodo: 'manha', ordem: 1 },
        { titulo: 'Alimentar, medicar e higienizar baias dos animais internados', periodo: 'manha', ordem: 2 },
        { titulo: 'Conferência do caixa inicial e fundo de troco', periodo: 'manha', ordem: 3 },
        { titulo: 'Ligar e calibrar equipamentos laboratoriais', periodo: 'manha', ordem: 4 },
        { titulo: 'Reposição de materiais e insumos nos consultórios e centro cirúrgico', periodo: 'tarde', ordem: 5 },
        { titulo: 'Limpeza geral e desinfecção da recepção e consultórios', periodo: 'tarde', ordem: 6 },
        { titulo: 'Checagem e atualização dos prontuários e retornos', periodo: 'tarde', ordem: 7 },
        { titulo: 'Descarte de lixo biológico e perfurocortantes conforme protocolo', periodo: 'noite', ordem: 8 },
        { titulo: 'Fechamento de caixa e conferência de maquinetas do dia', periodo: 'noite', ordem: 9 },
        { titulo: 'Verificar trincas, portas trancadas e ativar sistema de alarme', periodo: 'noite', ordem: 10 }
      ];

      for (const item of defaults) {
        await db`
          INSERT INTO checklist_templates (titulo, descricao, periodo, ordem, ativo)
          VALUES (${item.titulo}, '', ${item.periodo}, ${item.ordem}, true)
        `;
      }
    }
  }
}

export async function getChecklistByDate(dateStr) {
  const db = getSQL();
  if (!db) return [];
  
  // Garantir que a tabela e seed existam
  await initChecklistDB(db);

  return await db`
    SELECT 
      t.id as template_id,
      t.titulo,
      t.descricao,
      t.periodo,
      t.ordem,
      COALESCE(l.concluido, false) as concluido,
      l.concluido_em,
      l.concluido_por,
      l.observacao,
      l.id as log_id
    FROM checklist_templates t
    LEFT JOIN checklist_logs l ON l.template_id = t.id AND l.data = ${dateStr}::date
    WHERE t.ativo = true
    ORDER BY 
      CASE t.periodo 
        WHEN 'manha' THEN 1 
        WHEN 'tarde' THEN 2 
        WHEN 'noite' THEN 3 
        ELSE 4 
      END ASC,
      t.ordem ASC, 
      t.id ASC
  `;
}

export async function toggleChecklistItem({ template_id, data, concluido, observacao, concluido_por }) {
  const db = getSQL();
  if (!db) return null;

  const concluidoEm = concluido ? new Date().toISOString() : null;

  const res = await db`
    INSERT INTO checklist_logs (template_id, data, concluido, concluido_em, concluido_por, observacao)
    VALUES (${template_id}, ${data}::date, ${concluido}, ${concluidoEm}, ${concluido_por || null}, ${observacao || null})
    ON CONFLICT (template_id, data) DO UPDATE SET
      concluido = EXCLUDED.concluido,
      concluido_em = EXCLUDED.concluido_em,
      concluido_por = EXCLUDED.concluido_por,
      observacao = COALESCE(EXCLUDED.observacao, checklist_logs.observacao)
    RETURNING *
  `;
  return res[0];
}

export async function createChecklistTemplate({ titulo, descricao, periodo, ordem }) {
  const db = getSQL();
  if (!db) return null;
  const res = await db`
    INSERT INTO checklist_templates (titulo, descricao, periodo, ordem, ativo)
    VALUES (${titulo}, ${descricao || ''}, ${periodo || 'manha'}, ${ordem || 0}, true)
    RETURNING *
  `;
  return res[0];
}

export async function deleteChecklistTemplate(id) {
  const db = getSQL();
  if (!db) return false;
  // Exclusao definitiva do template (com cascade dos logs)
  await db`DELETE FROM checklist_templates WHERE id = ${id}`;
  return true;
}

export async function query(queryStr, params = []) {
  const db = getSQL();
  if (!db) throw new Error('Database not available');
  return db(queryStr, ...params);
}

export { getSQL };


