const { app, BrowserWindow, ipcMain, Menu} = require('electron');
const url = require('url')
const path = require('path');
const { db } = require(path.join(__dirname, 'main', 'database', 'connection.js')); 
require(path.join(__dirname, 'main', 'ipcHandler'))(ipcMain, db); 

function createMainWindow() {

    const mainWindow = new BrowserWindow({
        title: 'Organizador Documentos',
        width: 1500,
        height: 900,
        icon: path.join(__dirname, 'renderer','assets', 'J1J.ico'),
        webPreferences: {
            preload: path.join(__dirname, 'main', 'preload.js'),
            //Medidas de segurança
            contextIsolation: true,
            sandbox: true,
            nodeIntegration: false,
        }
    });

    const startUrl = url.format({
        pathname: path.join(__dirname, 'renderer', 'index.html'),
        protocol: 'file',
        slashes: true,
    });

    Menu.setApplicationMenu(null);

    mainWindow.loadURL(startUrl);
}

app.whenReady().then(createMainWindow);

app.on('window-all-closed', () => {
    if(process.platform !== 'darwin') app.quit();
});
