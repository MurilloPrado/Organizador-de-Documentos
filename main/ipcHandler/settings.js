const { dialog } = require('electron');

module.exports = (ipcMain, db) => {
    ipcMain.handle('settings:chooseDirectory', async () => {
        const result = await dialog.showOpenDialog({
            properties: ['openDirectory', 'createDirectory'],
            title: 'Selecione o diretório padrão'
        });
        if (result.canceled) {
            return null;
        } else {
            return result.filePaths[0];
        }
    });

    // Mantém somente um diretório padrão
    ipcMain.handle('settings:setDirectory', (_evt, path) => {
        if (!path) throw new Error('Caminho inválido');
        db.prepare(`
            INSERT INTO diretorioPadrao (id, caminho) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET caminho=excluded.caminho
        `) .run(String(path).trim());
        return { success: true };
    });

    ipcMain.handle('settings:getDirectory', () => {
        const row = db.prepare('SELECT caminho FROM diretorioPadrao WHERE id=1').get();
        return row ? row.caminho : null;
    });
}