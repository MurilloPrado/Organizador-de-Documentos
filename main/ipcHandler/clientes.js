//Recolhe os dados de clientes

module.exports = (ipcMain, db) => {
    //Lista todos os clientes
    ipcMain.handle('clientes:list', () => {
        return db.prepare('SELECT IDcliente AS id, nome, tel FROM clientes ORDER BY IDcliente DESC').all();
    });

    //Cria um novo cliente
    ipcMain.handle('clientes:create', (_evt, { nome, tel }) => {
        if(!nome) throw new Error('Nome inválido');
        const info = db.prepare('INSERT INTO clientes (nome, tel) VALUES (?,?)').run(nome.trim(), tel || null);
        return { id: info.lastInsertRowid};
    });
}