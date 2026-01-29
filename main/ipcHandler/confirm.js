const { ipcMain, dialog } = require('electron');

module.exports = (ipcMain) => {
  ipcMain.handle('showConfirm', async (_event, { message, single }) => {
    const isSingle = single === true;

    const result = await dialog.showMessageBox({
      type: 'info',
      title: 'Confirmação',
      message,
      buttons: isSingle ? ['OK'] : ['Não', 'Sim'],
      defaultId: isSingle ? 0 : 1,
      cancelId: 0,
    });

    if (isSingle) return true;
    return result.response === 1;
  });
};
