const { dialog, shell } = require('electron');

module.exports = function registerFiles(ipcMain) {
    ipcMain.handle('files:choose', async(event, { multi = true, filters = [] } = {}) => {
        const result = await dialog.showOpenDialog({
            properties: multi ? ['openFile', 'multiSelections'] : ['openFile'],
            filters: filters.length ? filters :[
                { name: 'Todos os arquivos', extensions: ['*'] },
            ]
        });

        if(result.canceled) return [];
        return result.filePaths || [];             
    });

    ipcMain.handle('files:openPath', async(event, absPath) => {
        if(!absPath || typeof absPath !== 'string') throw new Error('Caminho inválido');
        const err = await shell.openPath(absPath);
        if(err) throw new Error(err);
        return true;  
    });

    ipcMain.handle('files:exists', async (_e, absPath) => {
        try { 
            return fs.existsSync(absPath); 
        } catch { 
            return false; 
        }
    });
}