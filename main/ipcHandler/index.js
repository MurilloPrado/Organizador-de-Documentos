//Agregador dos IPCs

const clientes = require('./clientes');
const settings = require('./settings');
const documentos = require('./documentos');
const files = require('./files');
const listDocumentos = require('./listDocumentos');
const confirm = require('./confirm');
const financeiro = require('./financeiro');
const dashboard = require('./dashboard');

module.exports = (ipcMain, db) => {
    clientes(ipcMain, db);
    settings(ipcMain, db);
    documentos(ipcMain, db);
    files(ipcMain);
    listDocumentos(ipcMain, db);
    confirm(ipcMain);
    financeiro(ipcMain, db);
    dashboard(ipcMain, db);
    //outros ipcs...
}