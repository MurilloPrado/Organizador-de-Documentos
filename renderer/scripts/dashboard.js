let charts = {};

function formatCurrency(v) {
  return Number(v || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

function destroy(key) {
  if (charts[key]) {
    charts[key].destroy();
    delete charts[key];
  }
}

async function loadDashboard() {
  const data = await window.api.dashboard.getData();

  // ===== Cards =====
  document.getElementById('totalGanhos').textContent =
    formatCurrency(data.cards.ganhos);

  document.getElementById('totalCustos').textContent =
    formatCurrency(data.cards.custos);

  document.getElementById('resultadoFinal').textContent =
    formatCurrency(data.cards.resultado);

  document.getElementById('margemLucro').textContent =
    `${data.cards.margem.toFixed(2)}%`;

  document.getElementById('resultadoFinal').style.color =
    data.cards.resultado >= 0 ? '#16a34a' : '#dc2626';

  // ===== Ganhos x Custos =====
  destroy('bar');
  charts.bar = new Chart(
    document.getElementById('chartGanhosCustos'),
    {
      type: 'bar',
      data: {
        labels: data.ganhosVsCustos.labels,
        datasets: [
          { label: 'Custos', data: data.ganhosVsCustos.custos },
          { label: 'Ganhos', data: data.ganhosVsCustos.ganhos }
        ]
      }
    }
  );

  // ===== Distribuição de Custos =====
  destroy('pie');
  charts.pie = new Chart(
    document.getElementById('chartDistribuicaoCustos'),
    {
      type: 'pie',
      data: {
        labels: data.distribuicaoCustos.labels,
        datasets: [{ data: data.distribuicaoCustos.valores }]
      }
    }
  );

  // ===== Evolução Financeira =====
  destroy('line1');
  charts.line1 = new Chart(
    document.getElementById('chartEvolucaoFinanceira'),
    {
      type: 'line',
      data: {
        labels: data.evolucao.labels,
        datasets: [{
          label: 'Resultado Mensal',
          data: data.evolucao.resultado,
          tension: 0.3
        }]
      }
    }
  );

  // ===== Saldo Acumulado =====
  destroy('line2');
  charts.line2 = new Chart(
    document.getElementById('chartSaldoAcumulado'),
    {
      type: 'line',
      data: {
        labels: data.saldoAcumulado.labels,
        datasets: [{
          label: 'Saldo Acumulado',
          data: data.saldoAcumulado.valores,
          fill: true,
          tension: 0.3
        }]
      }
    }
  );

  // ===== Top Custos =====
  const tbody = document.getElementById('topCustosTable');
  tbody.innerHTML = '';

  data.topCustos.forEach(i => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${i.titulo || '-'}</td>
      <td>${i.categoria || '-'}</td>
      <td>${formatCurrency(i.valor)}</td>
      <td>${new Date(i.createdAt).toLocaleDateString('pt-BR')}</td>
    `;
    tbody.appendChild(tr);
  });
}

loadDashboard();
