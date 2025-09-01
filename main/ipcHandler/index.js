//Agregador dos IPCs

const clientes = require('./clientes');
const settings = require('./settings');

module.exports = (ipcMain, db) => {
    clientes(ipcMain, db);
    settings(ipcMain, db);
    documentos(ipcMain, db);
    //outros ipcs...
}