//Agregador dos IPCs

const clientes = require('./clientes');

module.exports = (ipcMain, db) => {
    clientes(ipcMain, db);
    //outros ipcs...
}