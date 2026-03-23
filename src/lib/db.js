import { neon } from '@neondatabase/serverless';

let sql = null;

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
      nome VARCHAR(200) NOT NULL DEFAULT 'Laborat\u00f3rio 1',
      ativo BOOLEAN NOT NULL DEFAULT true,
      catalogo JSONB DEFAULT '[]'
    )
  `;

  await db`
    INSERT INTO labs (nome, ativo, catalogo)
    SELECT 'Laborat\u00f3rio 1', true, '[]'::jsonb
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
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await db`
    CREATE TABLE IF NOT EXISTS imagem_records (
      id SERIAL PRIMARY KEY,
      month_key VARCHAR(7) NOT NULL,
      nome VARCHAR(200) NOT NULL,
      exame VARCHAR(300),
      valor DECIMAL(10,2) DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

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

  await db`
    INSERT INTO maquinetas (nome, maximo)
    SELECT 'Maquineta 1', 0 WHERE NOT EXISTS (SELECT 1 FROM maquinetas WHERE id=1);
  `;
  await db`
    INSERT INTO maquinetas (nome, maximo)
    SELECT 'Maquineta 2', 0 WHERE NOT EXISTS (SELECT 1 FROM maquinetas WHERE id=2);
  `;
  await db`
    INSERT INTO maquinetas (nome, maximo)
    SELECT 'Maquineta 3', 0 WHERE NOT EXISTS (SELECT 1 FROM maquinetas WHERE id=3);
  `;

  await db`
    CREATE TABLE IF NOT EXISTS maquinetas_records (
      id SERIAL PRIMARY KEY,
      maquineta_id INTEGER NOT NULL,
      month_key VARCHAR(7) NOT NULL,
      data VARCHAR(20),
      nota VARCHAR(10) DEFAULT 'N/A',
      valor DECIMAL(10,2) DEFAULT 0
    )
  `;

  await db`
    CREATE TABLE IF NOT EXISTS maquinetas_obs (
      id SERIAL PRIMARY KEY,
      maquineta_id INTEGER NOT NULL,
      month_key VARCHAR(7) NOT NULL,
      texto TEXT DEFAULT '',
      UNIQUE(maquineta_id, month_key)
    )
  `;
}

export async function query(queryStr, params = []) {
  const db = getSQL();
  if (!db) throw new Error('Database not available');
  return db(queryStr, ...params);
}

export { getSQL };
