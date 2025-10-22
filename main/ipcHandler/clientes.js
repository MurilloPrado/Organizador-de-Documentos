//Recolhe os dados de clientes

module.exports = (ipcMain, db) => {
    //Lista todos os clientes
    ipcMain.handle('clientes:list', () => {
        return db.prepare('SELECT IDcliente AS id, nome, tel FROM clientes ORDER BY IDcliente DESC').all();
    });

    //Cria um novo cliente
    ipcMain.handle('clientes:create', (_evt, payload) => {
        const c = payload.cliente ?? payload;
        const e = payload.endereco ?? {};

        const { cliente, endereco} = payload;
        const nome = String(c?.nome || '').trim();
        if(!nome) throw new Error('Nome inválido');

        const tipoCliente = c?.tipo || null;
        const cadastroGeral = c?.cadastroGeral || null;
        const email = c?.email || null;
        const tel = c?.tel || null;

        const cep = e?.cep || null;
        const cidade = e?.cidade || null;
        const bairro = e?.bairro || null;
        const numero = e?.numero || null;
        const complemento = e?.complemento || null;

        const insertCliente = db.prepare(`
            INSERT INTO clientes (nome, tipoCliente, cadastroGeral, email, tel)
            VALUES (?, ?, ?, ?, ?)
        `);

        const insertEndereco = db.prepare(`
            INSERT INTO endereco (idCliente, cep, cidade, bairro, numero, complemento)
            VALUES (?, ?, ?, ?, ?, ?)
        `);

        const tx = db.transaction(() => {
            const info = insertCliente.run(nome, tipoCliente, cadastroGeral, email, tel);
            const idCliente = Number(info.lastInsertRowid);

            if(endereco) {
                insertEndereco.run(idCliente, cep, cidade, bairro, numero, complemento);
            }

            return { id: idCliente };
        });

        return tx();
    });

    ipcMain.handle('clientes:searchPrefix', async(_evt, q) => {
        const prefix = String(q || '').trim();
        if(prefix.length < 2) return [];
        const stmt = db.prepare(`
            SELECT nome FROM clientes
            WHERE nome LIKE ? COLLATE NOCASE
            ORDER BY nome    
        `);

        const rows = stmt.all(prefix + '%'); 
        return rows.map(r => r.nome);
    });
}