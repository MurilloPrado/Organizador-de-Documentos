//Recolhe os dados de clientes

module.exports = (ipcMain, db) => {
    // Função para normalizar texto (remove acentos e força minúsculas)
    function normalize(text) {
      return String(text || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/ç/g, 'c')
        .toLowerCase();
    }
    if (!db.__norm_registered) {
      db.function('norm', normalize);
      db.__norm_registered = true;
    }

    ipcMain.handle('clientes:list', (_evt, opts = {}) => {
      const { query = '', limit = 200, offset = 0 } = opts;

      const q = normalize(query);

      let sql = `
        SELECT DISTINCT
          c.IDcliente AS id,
          c.nome,
          c.tel
        FROM clientes c
        LEFT JOIN endereco e ON e.idCliente = c.IDcliente
        WHERE 1=1
      `;
      const params = [];

      if (q) {
        sql += `
          AND (
            norm(c.nome)             LIKE ?
            OR norm(c.cadastroGeral) LIKE ?
            OR norm(c.email)         LIKE ?
            OR norm(c.tel)           LIKE ?
            OR norm(e.cidade)        LIKE ?
            OR norm(e.bairro)        LIKE ?
            OR norm(e.rua)           LIKE ?
            OR norm(e.cep)           LIKE ?
          )
        `;
        params.push(
          `%${q}%`, // nome
          `%${q}%`, // cadastroGeral
          `%${q}%`, // email
          `%${q}%`, // telefone
          `%${q}%`, // cidade
          `%${q}%`, // bairro
          `%${q}%`,
          `%${q}%`  // cep
        );
      }

      sql += ` ORDER BY c.IDcliente DESC LIMIT ? OFFSET ? `;
      params.push(Number(limit) || 200, Number(offset) || 0);

      try {
        console.log('[SQL clientes:list]', sql);
        console.log('[params]', params);
        return db.prepare(sql).all(...params);
      } catch (err) {
        console.error('[SQL ERROR clientes:list]', err);
        throw err;
      }
    });


    //Cria um novo cliente
    ipcMain.handle('clientes:create', (_evt, payload) => {
        const c = payload.cliente ?? payload;
        const e = payload.endereco ?? {};
        const contato = payload.contato ?? {};

        const { cliente, endereco} = payload;
        const nome = String(c?.nome || '').trim();
        if(!nome) throw new Error('Nome inválido');

        const tipoCliente = c?.tipo || null;
        const cadastroGeral = c?.cadastroGeral || null;
        const email = c?.email || null;
        const tel = c?.tel || null;

        const contatoNome = contato?.nome || null;
        const contatoTel = contato?.tel || null;

        const cep = e?.cep || null;
        const cidade = e?.cidade || null;
        const bairro = e?.bairro || null;
        const numero = e?.numero || null;
        const complemento = e?.complemento || null;
        const rua = e?.rua || null;

        const insertCliente = db.prepare(`
            INSERT INTO clientes (nome, tipoCliente, cadastroGeral, email, tel)
            VALUES (?, ?, ?, ?, ?)
        `);

        const insertContato = db.prepare(`
          INSERT INTO contato (idCliente, nome, tel)
          VALUES (?, ?, ?)
        `);

        const insertEndereco = db.prepare(`
            INSERT INTO endereco (idCliente, cep, cidade, bairro, numero, complemento, rua)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        const tx = db.transaction(() => {
            const info = insertCliente.run(nome, tipoCliente, cadastroGeral, email, tel);
            const idCliente = Number(info.lastInsertRowid);
            
            if (contatoNome || contatoTel) {
              insertContato.run(idCliente, contatoNome, contatoTel);
            }

            if(endereco) {
                insertEndereco.run(idCliente, cep, cidade, bairro, numero, complemento, rua);
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

        const contato = db.prepare(`
          SELECT idContato AS id, nome, tel
          FROM contato
          WHERE idCliente = ?
          LIMIT 1
        `).get(cid) || {};

        const endereco = db.prepare(`
            SELECT cep, cidade, bairro, numero, complemento, rua
            FROM endereco
            WHERE idCliente = ?
            LIMIT 1
        `).get(cid) || {};


        return { cliente, contato, endereco };
    });

  // Atualizar cliente + endereço
  ipcMain.handle('clientes:update', (_evt, payload) => {
    const c = payload?.cliente;
    const e = payload?.endereco || {};
    const contato = payload?.contato || {};

    if(!c?.id) throw new Error('ID do cliente é obrigatório.');
    const id = Number(c.id);

    const nome = String(c?.nome || '').trim();
    if(!nome) throw new Error('Nome inválido');

    const tipoCliente = c?.tipo || null;
    const cadastroGeral = c?.cadastroGeral || null;
    const email = c?.email || null;
    const tel = c?.tel || null;

    const contatoNome = contato?.nome || null;
    const contatoTel = contato?.tel || null;

    const cep = e?.cep || null;
    const cidade = e?.cidade || null;
    const bairro = e?.bairro || null;
    const numero = e?.numero || null;
    const complemento = e?.complemento || null;
    const rua = e?.rua || null;

    const updateCliente = db.prepare(`
      UPDATE clientes
      SET nome = ?, tipoCliente = ?, cadastroGeral = ?, email = ?, tel = ?
      WHERE IDcliente = ?
    `);

    const selectEndereco = db.prepare(`SELECT COUNT(*) AS n FROM endereco WHERE idCliente = ?`).get(id);

    const insertEndereco = db.prepare(`
      INSERT INTO endereco (idCliente, cep, cidade, bairro, numero, complemento, rua)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const updateEndereco = db.prepare(`
      UPDATE endereco
      SET cep = ?, cidade = ?, bairro = ?, numero = ?, complemento = ?, rua = ?
      WHERE idCliente = ?
    `);

    const selectContato = db.prepare(`
      SELECT idContato FROM contato WHERE idCliente = ? LIMIT 1
    `);

    const insertContato = db.prepare(`
      INSERT INTO contato (idCliente, nome, tel)
      VALUES (?, ?, ?)
    `);

    const updateContato = db.prepare(`
      UPDATE contato
      SET nome = ?, tel = ?
      WHERE idCliente = ?
    `);


    const tx = db.transaction(() => {
      updateCliente.run(nome, tipoCliente, cadastroGeral, email, tel, id);

      if(selectEndereco?.n > 0){
        updateEndereco.run(cep, cidade, bairro, numero, complemento, rua, id);
      } else {
        insertEndereco.run(id, cep, cidade, bairro, numero, complemento, rua);
      }

      if (contatoNome || contatoTel) {
        const found = selectContato.get(id);
        if (found) {
          // já tinha contato → atualiza
          updateContato.run(contatoNome, contatoTel, id);
        } else {
          // não tinha → cria agora com o idCliente existente
          insertContato.run(id, contatoNome, contatoTel);
        }
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