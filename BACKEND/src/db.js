const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const { ensureUsuariosNombreNullable, ensureCertificadosSchema } = require('./schema');

let dbInstance = null;

async function getDb() {
  if (dbInstance) return dbInstance;

  const SQL = await initSqlJs();
  const dbPath = path.join(__dirname, 'BD.sqlite');

  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    dbInstance = new SQL.Database(buffer);
  } else {
    dbInstance = new SQL.Database();
  }

  const migrado = ensureUsuariosNombreNullable(dbInstance);
  const esquemaActualizado = ensureCertificadosSchema(dbInstance);
  if (migrado || esquemaActualizado) {
    saveDb(dbInstance);
  }

  return dbInstance;
}

function saveDb(db) {
  const data = db.export();
  const buffer = Buffer.from(data);
  const dbPath = path.join(__dirname, 'BD.sqlite');
  fs.writeFileSync(dbPath, buffer);
}

module.exports = { getDb, saveDb };
