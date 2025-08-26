//Realiza a conexão com o banco de dados

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'documents.db');
const db = new Database(dbPath);

module.exports = { db };