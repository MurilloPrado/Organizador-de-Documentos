
// Conexão SQLite robusta usando pasta segura (userData) + migração automática do caminho antigo

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

let db = null;
let dbPathInUse = null;

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function migrateIfNeeded(app) {
  // Novo local seguro
  const userData = app.getPath('userData');            // ex.: C:\Users\<user>\AppData\Roaming\<AppName>
  const dataDir  = path.join(userData, 'data');
  ensureDir(dataDir);

  const newPath = path.join(dataDir, 'documents.db');

  // Local antigo (comum: dentro da pasta do app)
  // ajuste aqui caso seu app antigo estivesse em outro local:
  const oldPath = path.join(__dirname, 'documents.db');

  if (fs.existsSync(oldPath) && !fs.existsSync(newPath)) {
    try {
      fs.copyFileSync(oldPath, newPath); // copia banco antigo para o novo local
      // opcional: renomear o antigo para .bak
      // fs.renameSync(oldPath, oldPath + '.bak');
    } catch (e) {
      // se falhar a cópia, tentaremos abrir o oldPath como fallback
    }
  }

  return fs.existsSync(newPath) ? newPath : (fs.existsSync(oldPath) ? oldPath : newPath);
}

function runPragmas(_db) {
  try {
    _db.pragma('journal_mode = WAL');
    _db.pragma('synchronous = NORMAL');
  } catch {}
}

function runMigrations(_db) {
  // Exemplo básico usando PRAGMA user_version
  // - mantenha suas migrações idempotentes
  // - sempre em transação quando alterar schema

  const row = _db.prepare('PRAGMA user_version').get();
  const current = row?.user_version ?? 0;

  // Exemplo: migrar para versão 1
  if (current < 1) {
    const tx = _db.transaction(() => {
      // coloque aqui seus ALTER TABLE / CREATE INDEX etc.
      // _db.prepare("ALTER TABLE clientes ADD COLUMN createdAt TEXT").run();

      _db.prepare('PRAGMA user_version = 1').run();
    });
    tx();
  }

  // // Exemplo: próxima versão
  // if (current < 2) {
  //   const tx = _db.transaction(() => {
  //     // ...
  //     _db.prepare('PRAGMA user_version = 2').run();
  //   });
  //   tx();
  // }
}

function initDatabase(app) {
  if (db) return db;

  const resolvedPath = migrateIfNeeded(app);
  ensureDir(path.dirname(resolvedPath));

  db = new Database(resolvedPath);
  dbPathInUse = resolvedPath;

  runPragmas(db);
  runMigrations(db);

  return db;
}

function closeDatabase() {
  try { db?.close?.(); } catch {}
  db = null;
  dbPathInUse = null;
}

function getDbPath() {
  return dbPathInUse;
}

module.exports = {
  initDatabase,
  closeDatabase,
  getDbPath,
};
