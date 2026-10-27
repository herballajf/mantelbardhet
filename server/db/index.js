const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '../../data.sqlite');

let dbInstance = null;

function getDb() {
  if (!dbInstance) {
    dbInstance = new DatabaseSync(DB_PATH);
    dbInstance.exec('PRAGMA foreign_keys = ON;');
    dbInstance.exec('PRAGMA journal_mode = WAL;');
  }
  return dbInstance;
}

function initDb() {
  const db = getDb();
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schemaSql);
  return db;
}

// Helper methods for clean SQL execution
function queryAll(sql, params = []) {
  const db = getDb();
  const stmt = db.prepare(sql);
  return stmt.all(...params);
}

function queryOne(sql, params = []) {
  const db = getDb();
  const stmt = db.prepare(sql);
  const rows = stmt.all(...params);
  return rows.length > 0 ? rows[0] : null;
}

function execute(sql, params = []) {
  const db = getDb();
  const stmt = db.prepare(sql);
  return stmt.run(...params);
}

function transaction(fn) {
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
  DB_PATH
};
