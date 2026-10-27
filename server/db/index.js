const path = require('path');
const fs = require('fs');
const deasync = require('deasync');

const { DatabaseSync } = require('node:sqlite');
const { Pool } = require('pg');

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '../../data.sqlite');
const USE_POSTGRES = !!process.env.DATABASE_URL;

if (process.env.RENDER && !process.env.DATABASE_URL) {
  console.warn('Warning: Render is running without a managed DATABASE_URL. SQLite data will be lost on redeploy/restart. Set DATABASE_URL to a persistent database (Render Postgres, Neon, Supabase, etc.).');
}

let dbInstance = null;
let pgPool = null;
let transactionClient = null;

function getDb() {
  if (!dbInstance) {
    dbInstance = new DatabaseSync(DB_PATH);
    dbInstance.exec('PRAGMA foreign_keys = ON;');
    dbInstance.exec('PRAGMA journal_mode = WAL;');
  }
  return dbInstance;
}

function getPgPool() {
  if (!pgPool) {
    pgPool = new Pool({ connectionString: process.env.DATABASE_URL });
  }
  return pgPool;
}

function replaceQuestionMarks(sql) {
  let index = 0;
  return sql.replace(/\?/g, () => {
    index += 1;
    return `$${index}`;
  });
}

function normalizePostgresSql(sql) {
  let normalized = String(sql || '');

  normalized = normalized.replace(/datetime\(\s*['\"]now['\"]\s*\)/gi, 'CURRENT_TIMESTAMP');

  if (/INSERT\s+OR\s+REPLACE\s+INTO\s+system_settings/i.test(normalized)) {
    normalized = normalized.replace(
      /INSERT\s+OR\s+REPLACE\s+INTO\s+system_settings\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i,
      'INSERT INTO system_settings ($1) VALUES ($2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP'
    );
  }

  if (/^\s*INSERT\s+INTO\s+/i.test(normalized) && !/RETURNING\b/i.test(normalized)) {
    const tableMatch = normalized.match(/^\s*INSERT\s+INTO\s+([A-Za-z0-9_]+)/i);
    if (tableMatch) {
      normalized += ' RETURNING id';
    }
  }

  return replaceQuestionMarks(normalized);
}

function runPostgresSync(sql, params = [], mode = 'query') {
  let done = false;
  let result;
  let error;

  const client = transactionClient || getPgPool();
  const executeAsync = async () => {
    try {
      const response = await client.query(normalizePostgresSql(sql), params);
      if (mode === 'query') {
        result = response.rows;
      } else {
        result = {
          rowCount: response.rowCount,
          rows: response.rows,
          lastInsertRowid: response.rows && response.rows[0] ? response.rows[0].id : null,
          command: response.command,
          oid: response.oid
        };
      }
    } catch (err) {
      error = err;
    } finally {
      done = true;
    }
  };

  executeAsync();
  deasync.loopWhile(() => !done);

  if (error) {
    throw error;
  }

  return result;
}

function initDb() {
  if (USE_POSTGRES) {
    const schemaPath = path.join(__dirname, 'schema.postgres.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    const statements = schemaSql.split(';').map(s => s.trim()).filter(Boolean);

    for (const statement of statements) {
      runPostgresSync(statement, [], 'execute');
    }

    return true;
  }

  const db = getDb();
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schemaSql);
  return db;
}

function queryAll(sql, params = []) {
  if (USE_POSTGRES) {
    return runPostgresSync(sql, params, 'query');
  }

  const db = getDb();
  const stmt = db.prepare(sql);
  return stmt.all(...params);
}

function queryOne(sql, params = []) {
  if (USE_POSTGRES) {
    const rows = runPostgresSync(sql, params, 'query');
    return rows && rows.length > 0 ? rows[0] : null;
  }

  const db = getDb();
  const stmt = db.prepare(sql);
  const rows = stmt.all(...params);
  return rows.length > 0 ? rows[0] : null;
}

function execute(sql, params = []) {
  if (USE_POSTGRES) {
    return runPostgresSync(sql, params, 'execute');
  }

  const db = getDb();
  const stmt = db.prepare(sql);
  return stmt.run(...params);
}

function transaction(fn) {
  if (USE_POSTGRES) {
    let done = false;
    let result;
    let error;

    const run = async () => {
      const client = await getPgPool().connect();
      transactionClient = client;
      try {
        await client.query('BEGIN');
        result = await Promise.resolve(fn());
        await client.query('COMMIT');
      } catch (err) {
        error = err;
        await client.query('ROLLBACK').catch(() => {});
      } finally {
        transactionClient = null;
        client.release();
        done = true;
      }
    };

    run();
    deasync.loopWhile(() => !done);

    if (error) {
      throw error;
    }

    return result;
  }

  const db = getDb();
  db.exec('BEGIN TRANSACTION;');
  try {
    const result = fn(db);
    db.exec('COMMIT;');
    return result;
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
}

module.exports = {
  getDb,
  initDb,
  queryAll,
  queryOne,
  execute,
  transaction,
  DB_PATH,
  USE_POSTGRES
};
