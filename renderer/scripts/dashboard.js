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
  let activeDatasetIndex = null;

  function applyFocus(chart, focusIndex) {
    chart.data.datasets.forEach((ds, i) => {
        if (focusIndex === null) {
        // estado normal
        ds.backgroundColor = ds._originalColor;
        } else {
        ds.backgroundColor =
            i === focusIndex
            ? ds._originalColor
            : 'rgba(0,0,0,0.15)'; // apagado
        }
    });

    chart.update('active');
    }

  function renderLegend(chart, containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';

    chart.data.datasets.forEach((ds, index) => {
        const item = document.createElement('div');
        item.className = 'legend-item';

        const dot = document.createElement('span');
        dot.className = 'legend-dot';
        dot.style.background = ds.backgroundColor;

        const label = document.createElement('span');
        label.textContent = ds.label;

        item.appendChild(dot);
        item.appendChild(label);

       item.onclick = () => {
        if (activeDatasetIndex === index) {
            // segundo clique → volta tudo
            activeDatasetIndex = null;

            chart.data.datasets.forEach((_, i) => {
            chart.setDatasetVisibility(i, true);
            });
        } else {
            // foca apenas no clicado
            activeDatasetIndex = index;

            chart.data.datasets.forEach((_, i) => {
            chart.setDatasetVisibility(i, i === index);
            });
        }

        // efeito visual na legenda
        [...container.children].forEach((el, i) => {
            el.style.opacity =
            activeDatasetIndex === null || activeDatasetIndex === i
                ? '1'
                : '0.4';
        });

        chart.update('active');
        };

        container.appendChild(item);
    });
    }

  destroy('bar');
    charts.bar = new Chart(
    document.getElementById('chartGanhosCustos'),
    {
        type: 'bar',
        data: {
        labels: data.ganhosVsCustos.labels,
        datasets: [
            {
                label: 'Ganhos',
                data: data.ganhosVsCustos.ganhos,
                backgroundColor: '#65a6fa',
                borderRadius: 5,
                borderSkipped: false,
            },
            {
                label: 'Custos',
                data: data.ganhosVsCustos.custos,
                backgroundColor: '#004aad',
                borderRadius: 5,
                borderSkipped: false,
            }
        ]
        },
        options: {
        responsive: true,
        animation: {
            duration: 400,
            easing: 'easeOutQuart'
        },

        transitions: {
            active: {
            animation: {
                duration: 400
            }
            },
            hide: {
            animation: {
                duration: 400
            }
            },
            show: {
            animation: {
                duration: 400
            }
            }
        },
        plugins: {
            legend: {
                display: false
            },
             tooltip: {
                enabled: true,

                backgroundColor: '#111827',
                titleColor: '#ffffff',
                bodyColor: '#ffffff',

                padding: 14,  
                boxPadding: 8,
                cornerRadius: 10,

                titleFont: {
                size: 14,
                weight: '700'
                },

                bodyFont: {
                size: 13,
                weight: '600'
                },

                displayColors: true,

                callbacks: {
                title: (items) => {
                    const label = items[0].label;
                    if (Array.isArray(label)) {
                    return `${label[0]}, ${label[1]}`;
                    }
                    return label;
                },

                label: (ctx) => {
                    const valor = Number(ctx.raw || 0).toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                    });

                    return `${ctx.dataset.label}: R$ ${valor}`;
                }
                }
            },
        },
        scales: {
            y: {
            beginAtZero: true,
            grid: {
                color: 'rgba(0,0,0,0.08)'
            },
            title: {
                display: true,
                color: '#111827',
                text: 'Valor',
                font: { 
                    size: 20,
                    weight: 'bold' 
                }
            },
            ticks: {
                color: '#111827',
                font: {
                    size: 15,
                    weight: '600'
                },
                callback: v => v.toLocaleString('pt-BR')
            }
            },
            x: {
            grid: {
                display: false
            },
            title: {
                display: true,
                color: '#111827',
                text: 'Período',
                font: { 
                    size: 20,
                    weight: 'bold' 
                }
            },
            ticks: {
                color: '#111827',
                font: { 
                    size: 15,
                    weight: '600' 
                }
            }
            }
        }
        }
    }
    );

    renderLegend(charts.bar, 'ganhosCustosLegend');

  // ===== Distribuição de Custos =====
  function normalizeCategoria(label) {
    const map = {
        taxa: 'Taxas',
        despesas: 'Despesas Processuais',
        outros: 'Outros',
    };

    return map[label] || label;
  }

  function renderPieLegend(chart, containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';

    const meta = chart.getDatasetMeta(0);

    chart.data.labels.forEach((label, index) => {
        const item = document.createElement('div');
        item.className = 'legend-item';

        const dot = document.createElement('span');
        dot.className = 'legend-dot';
        dot.style.background = chart.data.datasets[0].backgroundColor[index];

        const text = document.createElement('span');
        text.textContent = label;

        item.appendChild(dot);
        item.appendChild(text);

        // estado inicial
        if (meta.data[index].hidden) {
        item.style.opacity = '0.4';
        }

        item.onclick = () => {
        const element = meta.data[index];

        element.hidden = !element.hidden;
        item.style.opacity = element.hidden ? '0.4' : '1';
        item.style.textDecoration = element.hidden ? 'line-through' : 'none';

        chart.update('active');
        };

        container.appendChild(item);
    });
    }

  destroy('pie');
  charts.pie = new Chart(
    document.getElementById('chartDistribuicaoCustos'),
    {
        type: 'pie',
        data: {
        labels: data.distribuicaoCustos.labels.map(normalizeCategoria),
        datasets: [{
            data: data.distribuicaoCustos.valores,
            backgroundColor: [
            '#40d9ff', // Taxas
            '#6ce5e8', // Despesas
            '#2f7497', // Outros
            ],
            borderWidth: 0,
            hoverBorderWidth: 0 
        }]
        },
        options: {
        responsive: true,
        maintainAspectRatio: true,
        aspectRatio: 1,

        animation: {
            duration: 400,
            easing: 'easeOutQuart'
        },

        plugins: {
            legend: {
            display: false
            },

            tooltip: {
            backgroundColor: '#111827',
            titleColor: '#ffffff',
            bodyColor: '#ffffff',
            padding: 14,
            cornerRadius: 10,

            titleFont: {
                size: 14,
                weight: '700'
            },

            bodyFont: {
                size: 13,
                weight: '600'
            },

            callbacks: {
                title: (items) => items[0].label,
                label: (ctx) => {
                    const dataset = ctx.chart.data.datasets[0];
                    const meta = ctx.chart.getDatasetMeta(0);

                    const total = dataset.data.reduce((sum, value, index) => {
                        return meta.data[index].hidden ? sum : sum + value;
                    }, 0);

                    const valor = ctx.raw || 0;
                    const percent = total > 0 ? (valor / total) * 100 : 0;

                    const valorFormatado = Number(valor).toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                    });

                    return ` R$ ${valorFormatado} (${percent.toFixed(1)}%)`;
                }
            }
            }
        }
        }
    }
  );
  renderPieLegend(charts.pie, 'custosLegend');

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
