module.exports = (ipcMain, db) => {

  ipcMain.handle('dashboard:getData', async () => {

    // ================= Base unificada =================
    const rows = db.prepare(`
      SELECT
        l.valor                       AS valor,
        l.tipoLancamento              AS categoria,
        'custo'                       AS tipo,
        l.tituloLancamento            AS titulo,
        COALESCE(l.createdAt, d.dataCriado) AS createdAt
      FROM lancamentos l
      LEFT JOIN documentos d ON d.idDocumento = l.idDocumento
      WHERE l.tipoLancamento != 'servico'

      UNION ALL

      SELECT
        p.valor                       AS valor,
        p.metodoPagamento             AS categoria,
        'pagamento'                   AS tipo,
        p.tituloPagamento             AS titulo,
        COALESCE(p.dataPagamento, d.dataCriado) AS createdAt
      FROM pagamentos p
      LEFT JOIN documentos d ON d.idDocumento = p.idDocumento
    `).all();

    // Garantir que os valores são numéricos
    rows.forEach(r => {
        r.valor = Number(r.valor) || 0;
    });

    // ================= Totais =================
    let ganhos = 0;
    let custos = 0;

    rows.forEach(r => {
      if (r.tipo === 'pagamento') ganhos += r.valor;
      if (r.tipo === 'custo') custos += r.valor;
    });

    const resultado = ganhos - custos;
    const margem = ganhos > 0 ? (resultado / ganhos) * 100 : 0;

    // ================= Agrupamento mensal =================
    const monthly = {};
    const monthNames = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

    rows.forEach(r => {
    const d = new Date(r.createdAt);

    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

    if (!monthly[key]) {
        monthly[key] = {
        ganhos: 0,
        custos: 0,
        label: [monthNames[d.getMonth()], String(d.getFullYear())]
        };
    }

    if (r.tipo === 'pagamento') monthly[key].ganhos += r.valor;
    if (r.tipo === 'custo') monthly[key].custos += r.valor;
    });

    const labels = Object.keys(monthly).sort();

    // ================= Distribuição de custos =================
    const custosPorCategoria = {};
    rows
      .filter(r => r.tipo === 'custo')
      .forEach(r => {
        const key = r.categoria || 'Outros';
        custosPorCategoria[key] = (custosPorCategoria[key] || 0) + r.valor;
      });

    // ================= Saldo acumulado =================
    let saldo = 0;
    const saldoAcumulado = labels.map(l => {
      saldo += monthly[l].ganhos - monthly[l].custos;
      return saldo;
    });

    // ================= Top custos =================
    const topCustos = rows
      .filter(r => r.tipo === 'custo')
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 5)
      .map(r => ({
        titulo: r.titulo,
        categoria: r.categoria,
        valor: r.valor,
        createdAt: r.createdAt
      }));

    // ================= Payload final =================
    return {
      cards: {
        ganhos,
        custos,
        resultado,
        margem
      },

      ganhosVsCustos: {
        labels: labels.map(k => monthly[k].label),
        ganhos: labels.map(l => monthly[l].ganhos),
        custos: labels.map(l => monthly[l].custos)
      },

      distribuicaoCustos: {
        labels: Object.keys(custosPorCategoria),
        valores: Object.values(custosPorCategoria)
      },

      evolucao: {
        labels,
        resultado: labels.map(l => monthly[l].ganhos - monthly[l].custos)
      },

      saldoAcumulado: {
        labels,
        valores: saldoAcumulado
      },

      topCustos
    };
  });
};
