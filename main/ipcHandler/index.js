//Agregador dos IPCs

const clientes = require('./clientes');
const settings = require('./settings');
const documentos = require('./documentos');
const files = require('./files');
const listDocumentos = require('./listDocumentos');

module.exports = (ipcMain, db) => {
    clientes(ipcMain, db);
    settings(ipcMain, db);
    documentos(ipcMain, db);
    files(ipcMain);
    listDocumentos(ipcMain, db);
    //outros ipcs...
}