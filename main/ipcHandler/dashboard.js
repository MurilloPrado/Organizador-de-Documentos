module.exports = (ipcMain, db) => {

  // ================= Utils compartilhados =================
  function applyDateFilter(rows, filter) {
    if (!filter) return rows;

    return rows.filter(r => {
      const d = new Date(r.createdAt);

      if (filter.mode === 'monthly') {
        return d.getFullYear() === filter.year &&
               d.getMonth() + 1 === filter.month;
      }

      if (filter.mode === 'yearly') {
        return d.getFullYear() === filter.year;
      }

      if (filter.mode === 'range') {
        return d >= new Date(filter.start) &&
               d <= new Date(filter.end);
      }

      if (filter.mode === 'last') {
        const from = new Date();
        from.setDate(from.getDate() - filter.last);
        return d >= from;
      }

      return true;
    });
  }

  function limitMonthlyLabels(labels, filter) {
    if (filter?.mode === 'monthly') return labels.slice(-1);
    if (filter?.mode === 'yearly') return labels.slice(-12);
    if (filter?.mode === 'lastMonths') return labels.slice(-filter.count);
    if (filter?.mode === 'range')  return labels;
    return labels.slice(-6); // padrão
  }

  function getBaseRows() {
    const rows = db.prepare(`
      SELECT
        l.idLancamento AS id,
        l.valor AS valor,
        l.tipoLancamento AS categoria,
        'custo' AS tipo,
        l.tituloLancamento AS titulo,
        COALESCE(l.createdAt, d.dataCriado) AS createdAt
      FROM lancamentos l
      LEFT JOIN documentos d ON d.idDocumento = l.idDocumento
      WHERE l.tipoLancamento != 'servico'

      UNION ALL

      SELECT
        p.idPagamento AS id,
        p.valor AS valor,
        p.metodoPagamento AS categoria,
        'pagamento' AS tipo,
        p.tituloPagamento AS titulo,
        COALESCE(p.dataPagamento, d.dataCriado) AS createdAt
      FROM pagamentos p
      LEFT JOIN documentos d ON d.idDocumento = p.idDocumento
    `).all();

    rows.forEach(r => r.valor = Number(r.valor) || 0);
    return rows;
  }

  function groupMonthly(rows, filter) {
    const monthly = {};
    const monthNames = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

    rows.forEach(r => {
      const d = new Date(r.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}`;

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

    const allLabels = Object.keys(monthly).sort();
    const labels = limitMonthlyLabels(allLabels, filter);

    return { monthly, labels };
  }

  // ================= IPCs =================

  // ---- Visão Geral (cards)
  ipcMain.handle('dashboard:getOverview', (_, filter) => {
    let rows = applyDateFilter(getBaseRows(), filter);

    let ganhos = 0, custos = 0;
    rows.forEach(r => {
      if (r.tipo === 'pagamento') ganhos += r.valor;
      if (r.tipo === 'custo') custos += r.valor;
    });

    const resultado = ganhos - custos;
    const margem = ganhos > 0 ? (resultado / ganhos) * 100 : 0;

    return { ganhos, custos, resultado, margem };
  });

  // ---- Ganhos x Custos
  ipcMain.handle('dashboard:getGanhosCustos', (_, filter) => {
    const rows = applyDateFilter(getBaseRows(), filter);
    const { monthly, labels } = groupMonthly(rows, filter);

    return {
      labels: labels.map(l => monthly[l].label),
      ganhos: labels.map(l => monthly[l].ganhos),
      custos: labels.map(l => monthly[l].custos)
    };
  });
  
  // ---- Distribuição de Custos
  ipcMain.handle('dashboard:getDistribuicaoCustos', (_, filter) => {
    const rows = applyDateFilter(getBaseRows(), filter);

    const map = {};
    rows.filter(r => r.tipo === 'custo')
      .forEach(r => {
        const key = r.categoria || 'Outros';
        map[key] = (map[key] || 0) + r.valor;
      });

    return {
      labels: Object.keys(map),
      valores: Object.values(map)
    };
  });

  // ---- Evolução Financeira
  ipcMain.handle('dashboard:getEvolucao', (_, filter) => {
    const rows = applyDateFilter(getBaseRows(), filter);
    const { monthly, labels } = groupMonthly(rows, filter);

    return {
      labels,
      resultado: labels.map(l => monthly[l].ganhos - monthly[l].custos)
    };
  });

  // ---- Saldo Acumulado
  ipcMain.handle('dashboard:getSaldo', (_, filter) => {
    const rows = applyDateFilter(getBaseRows(), filter);
    const { monthly, labels } = groupMonthly(rows, filter);

    let saldo = 0;
    const valores = labels.map(l => {
      saldo += monthly[l].ganhos - monthly[l].custos;
      return saldo;
    });

    return { labels, valores };
  });


  // ---- Top Custos
  ipcMain.handle('dashboard:getTopCustos', (_, filter) => {
    const rows = applyDateFilter(getBaseRows(), filter);

    return rows
      .filter(r => r.tipo === 'custo')
      .sort((a,b) => b.valor - a.valor)
      .slice(0,5)
      .map(r => ({
        id: r.id,
        titulo: r.titulo,
        categoria: r.categoria,
        valor: r.valor,
        createdAt: r.createdAt
      }));
  });

};
