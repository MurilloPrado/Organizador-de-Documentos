module.exports = (ipcMain, db) => {

  ipcMain.handle('financeiro:list', async () => {

    /*
      CUSTOS → tabela lancamentos
      Considerando: tipoLancamento != 'servico'  → custo
    */
    const custos = db.prepare(`
      SELECT
        l.idLancamento        AS id,
        'custo'               AS tipo,
        l.tituloLancamento    AS titulo,
        l.valor               AS valor,
        d.nomeDocumento       AS documento,
        c.nome                AS cliente,
         strftime(
          '%Y-%m-%dT%H:%M:%fZ',
          COALESCE(l.createdAt, d.dataCriado)
        )                     AS createdAt,
        l.tipoLancamento      AS categoria
      FROM lancamentos l
      LEFT JOIN documentos d ON d.idDocumento = l.idDocumento
      LEFT JOIN clientes   c ON c.idCliente   = d.idCliente
      WHERE l.tipoLancamento != 'servico'
    `).all();

    /*
      PAGAMENTOS → tabela pagamentos
    */
    let pagamentos = [];
    try {
      pagamentos = db.prepare(`
         SELECT
            p.idPagamento       AS id,
            'pagamento'         AS tipo,
            COALESCE(p.detalhes, 'Pagamento') AS titulo,
            p.valor             AS valor,
            d.nomeDocumento     AS documento,
            c.nome              AS cliente,
            strftime(
              '%Y-%m-%dT%H:%M:%fZ',
              COALESCE(p.dataPagamento, d.dataCriado)
            )                     AS createdAt,
            p.metodoPagamento   AS categoria
        FROM pagamentos p
        LEFT JOIN documentos d ON d.idDocumento = p.idDocumento
        LEFT JOIN clientes   c ON c.idCliente   = d.idCliente
      `).all();
    } catch (err) {
      // Caso ainda não exista tabela de pagamentos
      pagamentos = [];
    }

    // Unifica
    const result = [...custos, ...pagamentos];

    // Ordena do mais recente
    result.sort((a, b) => {
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    return result;
  });

  function createPagamento({
    titulo,
    valor,
    detalhes,
    idCliente,
    idDocumento,
    metodoPagamento
  }) {
    const stmt = db.prepare(`
      INSERT INTO pagamentos
      (
        idDocumento,
        idCliente,
        tituloPagamento,
        valor,
        detalhes,
        metodoPagamento,
        dataPagamento
      )
      VALUES (?, ?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    `);

    const res = stmt.run(
      idDocumento,
      idCliente,
      titulo,
      valor,
      detalhes || null,
      metodoPagamento
    );

    return { idPagamento: res.lastInsertRowid };
  }

  function createLancamento({
    titulo,
    valor,
    detalhes,
    idDocumento,
    tipoCusto
  }) {
    const stmt = db.prepare(`
      INSERT INTO lancamentos
      (
        idDocumento,
        tipoLancamento,
        tituloLancamento,
        detalhes,
        valor,
        createdAt
      )
      VALUES (?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    `);

    const res = stmt.run(
      idDocumento,
      tipoCusto,
      titulo,
      detalhes || null,
      valor
    );

    return { idLancamento: res.lastInsertRowid };
  }

  ipcMain.handle('financeiro:create', async (_, payload) => {
    const {
      tipo,
      titulo,
      valor,
      detalhes,
      idCliente,
      idDocumento,
      metodoPagamento,
      tipoCusto
    } = payload;

    if (!titulo || !valor) {
      throw new Error('Título e valor são obrigatórios');
    }

    if (tipo === 'Pagamento') {
      if (!idCliente || !idDocumento) {
        throw new Error('Cliente e documento são obrigatórios para pagamento');
      }

      return createPagamento({
        titulo,
        valor,
        detalhes,
        idCliente,
        idDocumento,
        metodoPagamento
      });
    }

    if (tipo === 'Custo') {
      return createLancamento({
        titulo,
        valor,
        detalhes,
        idDocumento,
        tipoCusto
      });
    }

    throw new Error('Tipo financeiro inválido');
  });

  ipcMain.handle('financeiro:listDocumentosByCliente', async (_, idCliente) => {
    if (!idCliente) return [];

    return db.prepare(`
      SELECT idDocumento, nomeDocumento
      FROM documentos
      WHERE idCliente = ?
      ORDER BY dataCriado DESC
    `).all(idCliente);
  });

  ipcMain.handle('financeiro:searchDocumentos', async (_, query) => {
    if (!query || query.length < 2) return [];

    return db.prepare(`
      SELECT
        d.idDocumento,
        d.nomeDocumento
      FROM documentos d
      WHERE d.nomeDocumento LIKE ?
      ORDER BY d.dataCriado DESC
      LIMIT 10
    `).all(`%${query}%`);
  });

  ipcMain.handle('financeiro:getClienteByDocumento', async (_, idDocumento) => {
    if (!idDocumento) return null;

    return db.prepare(`
      SELECT
        c.idCliente,
        c.nome
      FROM documentos d
      JOIN clientes c ON c.idCliente = d.idCliente
      WHERE d.idDocumento = ?
    `).get(idDocumento);
  });
};
