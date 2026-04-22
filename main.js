const log = require('electron-log');
log.transports.file.level = 'info';

const { app, BrowserWindow, ipcMain, Menu, dialog } = require('electron');
const url = require('url')
const path = require('path');
const { initDatabase, closeDatabase, } = require(path.join(__dirname, 'main', 'database', 'connection.js')); 

let autoUpdater = null;
try { ({ autoUpdater } = require('electron-updater')); } catch {}

let mainWindow = null;
let db = null;

function setupAutoUpdater() {
  if (!app.isPackaged) {
    // evita check em dev
    return;
  }

  autoUpdater.autoDownload = true;
  autoUpdater.disableWebInstaller = true; // evita web installer
  autoUpdater.allowDowngrade = false;

  autoUpdater.on('checking-for-update', () => {
    log.info('Checking for update');
    if (mainWindow) {
      mainWindow.webContents.send('update-status', {
        status: 'checking'
      });
    }
  });

  autoUpdater.on('update-available', (info) => {
    log.info('update-available', info.version);
    if (mainWindow) {
      mainWindow.webContents.send('update-status', {
        status: 'available',
        version: info.version
      });
    }
  });

  autoUpdater.on('update-not-available', () => {
    log.info('update-not-available');
    if (mainWindow) {
      mainWindow.webContents.send('update-status', {
        status: 'idle'
      });
    }
  });

   autoUpdater.on('download-progress', (p) => {
    const percent = Math.round(p.percent);
    log.info(`download-progress ${percent}%`);
    if (mainWindow) {
      mainWindow.webContents.send('update-status', {
        status: 'downloading',
        progress: percent
      });
    }
  });

  autoUpdater.on('error', (err) => {
    log.error(err);
    if (mainWindow) {
      mainWindow.webContents.send('update-status', {
        status: 'error',
        message: err.message || 'Erro ao atualizar'
      });
    }
  });

    autoUpdater.on('update-downloaded', (info) => {
    log.info('update-downloaded', info.version);

    if (mainWindow) {
      // avisa o renderer que terminou
      mainWindow.webContents.send('update-status', {
        status: 'downloaded',
        version: info.version
      });
    }

    const res = dialog.showMessageBoxSync({
      type: 'question',
      buttons: ['Reiniciar agora', 'Depois'],
      defaultId: 0,
      cancelId: 1,
      message: `Versão ${info.version} baixada`,
      detail: 'Deseja reiniciar para aplicar a atualização agora?',
    });
    if (res === 0) {
      setImmediate(() => autoUpdater.quitAndInstall(false, true));
    }
  });

  autoUpdater.checkForUpdates().catch(log.error);
}

function createMainWindow() {
    mainWindow = new BrowserWindow({
        title: 'Organizador de Documentos',
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

    // updates
    setupAutoUpdater();
    // apresenta o app
    createMainWindow();
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
