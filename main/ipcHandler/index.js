//Agregador dos IPCs

const clientes = require('./clientes');
const settings = require('./settings');
const documentos = require('./documentos');
const files = require('./files');
const listDocumentos = require('./listDocumentos');
const confirm = require('./confirm');

module.exports = (ipcMain, db) => {
    clientes(ipcMain, db);
    settings(ipcMain, db);
    documentos(ipcMain, db);
    files(ipcMain);
    listDocumentos(ipcMain, db);
    confirm(ipcMain);
    //outros ipcs...
}