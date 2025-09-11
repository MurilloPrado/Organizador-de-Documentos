//Agregador dos IPCs

const clientes = require('./clientes');
const settings = require('./settings');
const documentos = require('./documentos');
const files = require('./files');

module.exports = (ipcMain, db) => {
    clientes(ipcMain, db);
    settings(ipcMain, db);
    documentos(ipcMain, db);
    files(ipcMain);
    //outros ipcs...
}