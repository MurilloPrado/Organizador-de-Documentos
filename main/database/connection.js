
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
  // faz atualizações no banco
  const row = _db.prepare('PRAGMA user_version').get();
  const current = row?.user_version ?? 0;

  // Exemplo: migrar para versão 1
  if (current < 1) {
    const tx = _db.transaction(() => {
      _db.prepare('PRAGMA user_version = 1').run();
    });
    tx();
  }

  // adição do campo rua a tabela endereco
  if (current < 2) {
    const tx = _db.transaction(() => {
      try {
        _db.prepare('ALTER TABLE endereco ADD COLUMN rua TEXT').run();
      } catch (err) {
        // se já existir, ignora o erro (útil em reinstalações)
        if (!/duplicate column/i.test(err.message)) throw err;
      }
      _db.prepare('PRAGMA user_version = 2').run();
    });
    tx();
  }

  // adição da tabela contato
  if (current < 3) {
    const tx = _db.transaction(() => {
      try {
        _db.prepare(`
          CREATE TABLE IF NOT EXISTS contato (
            idContato INTEGER PRIMARY KEY AUTOINCREMENT,
            idCliente INTEGER,
            nome TEXT,
            tel TEXT,
            FOREIGN KEY (idCliente) REFERENCES clientes(IDcliente) ON DELETE CASCADE
          )
        `).run();
      } catch (err) {
        console.error('Erro ao criar tabela contato:', err);
      }
      _db.prepare('PRAGMA user_version = 3').run();
    });
    tx();
  }

  // atualização de datas
  if (current < 4) {
    const tx = _db.transaction(() => {

      // 1. Garante FK
      _db.prepare('PRAGMA foreign_keys = OFF').run();

      // 2. Corrige datas em lancamentos
      const res = _db.prepare(`
        UPDATE lancamentos
        SET createdAt = strftime(
          '%Y-%m-%dT%H:%M:%fZ',
          replace(createdAt, ' ', 'T')
        )
        WHERE createdAt IS NOT NULL
          AND createdAt NOT LIKE '%T%Z';
      `).run();

      console.log(`Migração datas: ${res.changes} registros atualizados`);

      // 3. Remove tabela pagamentos antiga (se existir)
      _db.prepare(`DROP TABLE IF EXISTS pagamentos;`).run();

      // 4. Cria pagamentos APENAS se não existir
      _db.prepare(`
        CREATE TABLE IF NOT EXISTS pagamentos (
          idPagamento     INTEGER PRIMARY KEY AUTOINCREMENT,
          idDocumento     INTEGER NOT NULL,
          idCliente       INTEGER NOT NULL,

          tituloPagamento TEXT    NOT NULL,
          valor           REAL    NOT NULL,
          detalhes        TEXT,
          metodoPagamento TEXT,
          dataPagamento   TEXT    NOT NULL,

          FOREIGN KEY (idDocumento) REFERENCES documentos(idDocumento),
          FOREIGN KEY (idCliente)   REFERENCES clientes(idCliente)
        );
      `).run();

      // 5. Reativa FK
      _db.prepare('PRAGMA foreign_keys = ON').run();

      // 6. Só agora marca a versão
      _db.prepare('PRAGMA user_version = 4').run();
    });

    try {
      tx();
    } catch (err) {
      console.error('Erro na migração para versão 4:', err);
      throw err; // IMPORTANTE: não engolir erro
    }
  }
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
