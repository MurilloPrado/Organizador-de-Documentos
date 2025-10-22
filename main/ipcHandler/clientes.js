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

    ipcMain.handle('clientes:getById', (_evt, id) => {
        const cid = Number(id);
        if(!cid) throw new Error('ID inválido');

        const cliente = db.prepare(`
            SELECT IDcliente AS id, nome, tipoCliente, cadastroGeral, email, tel
            FROM clientes
            WHERE IDcliente = ?
        `).get(cid);

        if(!cliente) return null;

        const endereco = db.prepare(`
            SELECT cep, cidade, bairro, numero, complemento
            FROM endereco
            WHERE idCliente = ?
            LIMIT 1
        `).get(cid) || {};

        return { cliente, endereco };
    });

  // Atualizar cliente + endereço
  ipcMain.handle('clientes:update', (_evt, payload) => {
    const c = payload?.cliente;
    const e = payload?.endereco || {};
    if(!c?.id) throw new Error('ID do cliente é obrigatório.');
    const id = Number(c.id);

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

    const updateCliente = db.prepare(`
      UPDATE clientes
      SET nome = ?, tipoCliente = ?, cadastroGeral = ?, email = ?, tel = ?
      WHERE IDcliente = ?
    `);

    const selectEndereco = db.prepare(`SELECT COUNT(*) AS n FROM endereco WHERE idCliente = ?`).get(id);
    const insertEndereco = db.prepare(`
      INSERT INTO endereco (idCliente, cep, cidade, bairro, numero, complemento)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const updateEndereco = db.prepare(`
      UPDATE endereco
      SET cep = ?, cidade = ?, bairro = ?, numero = ?, complemento = ?
      WHERE idCliente = ?
    `);

    const tx = db.transaction(() => {
      updateCliente.run(nome, tipoCliente, cadastroGeral, email, tel, id);

      if(selectEndereco?.n > 0){
        updateEndereco.run(cep, cidade, bairro, numero, complemento, id);
      } else {
        insertEndereco.run(id, cep, cidade, bairro, numero, complemento);
      }

      return { ok: true };
    });

    return tx();
  });

  // Excluir cliente (e endereço)
  ipcMain.handle('clientes:delete', (_evt, id) => {
    const cid = Number(id);
    if(!cid) throw new Error('ID inválido');

    const delEndereco = db.prepare(`DELETE FROM endereco WHERE idCliente = ?`);
    const delCliente  = db.prepare(`DELETE FROM clientes WHERE IDcliente = ?`);

    const tx = db.transaction(() => {
      delEndereco.run(cid);
      const info = delCliente.run(cid);
      if(info.changes < 1){
        throw new Error('Cliente não encontrado ou não excluído.');
      }
      return { ok: true };
    });

    return tx();
  });
}