const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const { autoUpdater } = require('electron-updater');
const url = require('url')
const path = require('path');
const { initDatabase, closeDatabase, } = require(path.join(__dirname, 'main', 'database', 'connection.js')); 

let mainWindow = null;
let db = null;

function createMainWindow() {
    mainWindow = new BrowserWindow({
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

    const startUrl = 
        process.env.ELECTRON_START_URL || 
        url.format({
            pathname: path.join(__dirname, 'renderer', 'index.html'),
            protocol: 'file',
            slashes: true,
        });


    Menu.setApplicationMenu(null);

    mainWindow.loadURL(startUrl);

    mainWindow.on('closed', () => {
        mainWindow = null;
    })
}

app.whenReady().then(() => {
    // conecta ao banco
    db = initDatabase(app);

    // conecta aos ipcs
    try {
        require(path.join(__dirname, 'main', 'ipcHandler'))(ipcMain, db);
    } catch (e) {
        console.error('[ipcHandler] erro ao registrar handlers:', e);
    }

    // apresenta o app
    createMainWindow();

    // updates
    autoUpdater.checkForUpdatesAndNotify();
    autoUpdater.on('before-quit-for-update', () => {
        closeDatabase();
    });
});

app.on('window-all-closed', () => {
    if(process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
    closeDatabase();
})

app.on('activate', () => {
    if(BrowserWindow.getAllWindows().length === 0) createMainWindow();
})
