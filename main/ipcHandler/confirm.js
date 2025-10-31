const { ipcMain, dialog } = require('electron');

module.exports = (ipcMain) => {
    ipcMain.handle('showConfirm', async (_event, message) => {
    const result = await dialog.showMessageBox({
        type: 'question',
        buttons: ['Não', 'Sim'],
        defaultId: 1,
        cancelId: 0,
        message,
        title: 'Confirmação',
    });
    return result.response === 1;
    });
}