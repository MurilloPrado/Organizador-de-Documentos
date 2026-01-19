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
      JOIN documentos d ON d.idDocumento = l.idDocumento
      JOIN clientes   c ON c.idCliente   = d.idCliente
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
        JOIN documentos d ON d.idDocumento = p.idDocumento
        JOIN clientes   c ON c.idCliente   = d.idCliente
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

};
