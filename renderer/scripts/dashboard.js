let charts = {};
const dateRanges = {
  overview: { de: null, ate: null },
  ganhosCustos: { de: null, ate: null },
  distribuicao: { de: null, ate: null },
  evolucao: { de: null, ate: null },
  saldo: { de: null, ate: null },
  topCustos: { de: null, ate: null }
};

// ================= Utils =================
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

function setChartEmpty(chartId, isEmpty) {
  const box = document
    .getElementById(chartId)
    ?.closest('.chart-box');

  if (!box) return;

  box.classList.toggle('is-empty', isEmpty);
}

function setTableEmpty(sectionId, isEmpty) {
  const section = document.getElementById(sectionId);
  if (!section) return;

  section.classList.toggle('is-empty', isEmpty);
}

function parsePickerDate(value) {
  if (!value) return null;
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

function formatDateBR(value) {
  if (!value) return '';
  const d = parsePickerDate(value);
  return d?.toLocaleDateString('pt-BR') || '';
}

// ================= Elementos =================
const panel = document.getElementById('dashboardFilterPanel');

const dashDateDeInput  = document.getElementById('dashDateDe');
const dashDateAteInput = document.getElementById('dashDateAte');

const dashDateDeText  = dashDateDeInput.nextElementSibling;
const dashDateAteText = dashDateAteInput.nextElementSibling;

const dashDateDeBox  = dashDateDeInput.parentElement;
const dashDateAteBox = dashDateAteInput.parentElement;

const dashClearDateBtn = document.getElementById('dashClearDate');

// ================= Filtro =================
const chartFilters = {
  overview: null,
  ganhosCustos: null,
  evolucao: null,
  saldo: null,
  distribuicao: null,
  topCustos: null
};

let activeFilterTarget = null;
let activeFilterButton = null;

function openFilterPanelBelowButton(button) {
  const rect = button.getBoundingClientRect();

  panel.style.position = 'absolute';
  panel.style.top = `${rect.bottom + window.scrollY + 8}px`; // 8px de espaço
  panel.style.right = `30px`;
  panel.style.zIndex = 9999;

  panel.hidden = false;
}

document.addEventListener('click', (e) => {
  const filterArea = e.target.closest('.section-filter');
  if (!filterArea) return;

  const header = filterArea.closest('.section-header');
  if (!header) return;

  const section = header.dataset.section;
  const button = filterArea.querySelector('.filter-btn');

  // se clicar no MESMO filtro já aberto → fecha
  if (!panel.hidden && activeFilterTarget === section) {
    panel.hidden = true;
    activeFilterTarget = null;
    activeFilterButton = null;
    return;
  }

  // abrir para nova seção
  activeFilterTarget = section;
  syncDateInputs(section);
  activeFilterButton = button;
  configureFilterPanel(section); 
  syncCheckedRadio(section);

  openFilterPanelBelowButton(button);
});

// fechar ao clicar fora
document.addEventListener('click', (e) => {
  if (panel.hidden) return;

  if (
    !panel.contains(e.target) &&
    !e.target.closest('.section-filter')
  ) {
    panel.hidden = true;
    activeFilterButton = null;
  }
});

// evita propagação para não fechar ao clicar dentro do painel
panel.addEventListener('click', (e) => {
  e.stopPropagation();
});

// aplica filtro
panel.addEventListener('change', async (e) => {
    if (!e.target.matches('input[name="periodo"]')) return;
    if (!activeFilterTarget) return;

    // limpa campo de período
    dateRanges[activeFilterTarget] = { de: null, ate: null };

    dashDateDeInput.value = '';
    dashDateAteInput.value = '';

    dashDateDeText.textContent = '__/__/__';
    dashDateAteText.textContent = '__/__/__';

    const filter = buildFilterFromUI();

    chartFilters[activeFilterTarget] = filter;

    updateFilterLabel(activeFilterTarget, filter);

    await dispatchLoad(activeFilterTarget, filter);

    activeFilterButton = null;
});

function configureFilterPanel(section) {
  const labels = panel.querySelectorAll('label[data-filter]');

  // reset geral
  labels.forEach(label => {
    label.style.display = 'none';
    const input = label.querySelector('input');
    if (input) input.disabled = true;
  });

  // regras por gráfico
  let allowed;

  if (section === 'ganhosCustos' || section === 'evolucao' || section === 'saldo') {
    allowed = ['lastMonths5', 'yearly']; // período depois
  } else {
    allowed = ['monthly', 'yearly', '30', '60', '90', 'all'];
  }

  allowed.forEach(value => {
    const label = panel.querySelector(`label[data-filter="${value}"]`);
    if (!label) return;

    label.style.display = 'block';
    const input = label.querySelector('input');
    if (input) input.disabled = false;
  });
}

function syncCheckedRadio(section) {
  const radios = panel.querySelectorAll('input[name="periodo"]');

  // limpa tudo
  radios.forEach(r => r.checked = false);

  const filter = chartFilters[section];

  // Ganhos x Custos / Evolução / Saldo → default visual
  if (!filter && (section === 'ganhosCustos' || section === 'evolucao' || section === 'saldo')) {
    const r = panel.querySelector('input[value="lastMonths5"]');
    if (r) r.checked = true;
    return;
  }

  if (!filter) {
    const r = panel.querySelector('input[value="all"]');
    if (r) r.checked = true;
    return;
  }

  if (chartFilters[section]?.mode === 'range') {
    const radios = panel.querySelectorAll('input[name="periodo"]');
    radios.forEach(r => r.checked = false);
    return;
  }

  if (filter.mode === 'monthly') {
    panel.querySelector('input[value="monthly"]').checked = true;
  }

  if (filter.mode === 'yearly') {
    panel.querySelector('input[value="yearly"]').checked = true;
  }

  if (filter.mode === 'last') {
    panel.querySelector(`input[value="${filter.last}"]`).checked = true;
  }

  if (filter.mode === 'lastMonths') {
    panel.querySelector('input[value="lastMonths5"]').checked = true;
  }
}

// limpa seleção dos radios
function clearPeriodoRadios() {
  const radios = panel.querySelectorAll('input[name="periodo"]');
  radios.forEach(r => r.checked = false);
}

// volta filtro padrão
function getDefaultFilter(section) {
  const now = new Date();

  // Ganhos x Custos → visual default (últimos meses)
  if (section === 'ganhosCustos' || section === 'evolucao' || section === 'saldo') {
    return null;
  }

  return {
    mode: 'monthly',
    year: now.getFullYear(),
    month: now.getMonth() + 1
  };
}

// altera nome do filtro
function updateFilterLabel(section, filter) {
  const label = document.querySelector(
    `.section-header[data-section="${section}"] .filter-label`
  );
  if (!label) return;

  
  if (!filter && ( section === 'ganhosCustos' || section === 'evolucao' || section === 'saldo')) {
    label.innerHTML = `<img src="assets/sort.png"> Últimos 5 meses`;
    return;
  }   

  if (filter.mode === 'monthly') {
    const date = new Date(filter.year, filter.month - 1);

    let mes = date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
    mes = mes.charAt(0).toUpperCase() + mes.slice(1);

    const ano = filter.year;

    label.innerHTML = `<img src="assets/sort.png"> Mês atual · ${mes}/${ano}`;
    return;
  }

  if (filter.mode === 'lastMonths') {
    label.innerHTML = `<img src="assets/sort.png"> Últimos ${filter.count} meses`;
    return;
  }

  if (filter.mode === 'yearly') {
    label.innerHTML = `<img src="assets/sort.png"> Ano atual · ${filter.year}`;
    return;
  }

  if (filter.mode === 'last') {
    label.innerHTML = `<img src="assets/sort.png"> Últimos ${filter.last} dias`;
  }

  if (filter.mode === 'range') {
    label.innerHTML =
        `<img src="assets/sort.png"> ${filter.label}`;
    return;
  }

  if (!filter) {
    label.innerHTML = `<img src="assets/sort.png"> Desde sempre`;
    return;
  }
}

function buildFilterFromUI() {
  const selected = document.querySelector(
    'input[name="periodo"]:checked'
  ).value;

  const now = new Date();

  if (selected === 'monthly') {
    const now = new Date();
    return {
      mode: 'monthly',
      year: now.getFullYear(),
      month: now.getMonth() + 1
    };
  }

  if (selected === 'lastMonths5') {
    return {
        mode: 'lastMonths',
        count: 5
    };
  }

  if (selected === 'yearly') {
    return {
      mode: 'yearly',
      year: now.getFullYear()
    };
  }

  if (['30','60','90'].includes(selected)) {
    return {
      mode: 'last',
      last: Number(selected)
    };
  }

  if (selected === 'all') {
    return null;
  }

  return null;
}

async function dispatchLoad(section, filter) {
  switch (section) {
    case 'overview':
      await loadOverview(filter);
      break;

    case 'ganhosCustos':
      await loadGanhosCustosChart(filter);
      break;

    case 'distribuicao':
      await loadDistribuicaoCustosChart(filter);
      break;

    case 'evolucao':
      await loadEvolucaoChart(filter);
      break;

    case 'saldo':
      await loadSaldoChart(filter);
      break;

    case 'topCustos':
      await loadTopCustosTable(filter);
      break;
  }
}

// ================= Período específico =================
dashDateDeBox.addEventListener('click', () => {
  dashDateDeInput.focus();
  dashDateDeInput.showPicker?.();
});

dashDateAteBox.addEventListener('click', () => {
  dashDateAteInput.focus();
  dashDateAteInput.showPicker?.();
});

dashDateDeInput.addEventListener('change', () => {
  if (!activeFilterTarget) return;

  dateRanges[activeFilterTarget].de =
    dashDateDeInput.value || null;

  dashDateDeText.textContent =
    dashDateDeInput.value
      ? formatDateBR(dashDateDeInput.value)
      : '__/__/__';
});

dashDateAteInput.addEventListener('change', () => {
  if (!activeFilterTarget) return;

  dateRanges[activeFilterTarget].ate =
    dashDateAteInput.value || null;

  dashDateAteText.textContent =
    dashDateAteInput.value
      ? formatDateBR(dashDateAteInput.value)
      : '__/__/__';

  applyDateRangeFilter();
});

dashClearDateBtn.addEventListener('click', () => {
  // limpar datas
  dateRanges[activeFilterTarget] = { de: null, ate: null };

  dashDateDeInput.value = '';
  dashDateAteInput.value = '';

  dashDateDeText.textContent = '__/__/__';
  dashDateAteText.textContent = '__/__/__';

  if (!activeFilterTarget) return;

  // voltar para filtro padrão
  const defaultFilter = getDefaultFilter(activeFilterTarget);

  chartFilters[activeFilterTarget] = defaultFilter;
  dateRanges[activeFilterTarget] = { de: null, ate: null };

  // atualizar label
  updateFilterLabel(activeFilterTarget, defaultFilter);

  // sincronizar radios
  syncCheckedRadio(activeFilterTarget);

  // recarregar gráfico
  dispatchLoad(activeFilterTarget, defaultFilter);
});

function applyDateRangeFilter() {
  if (!activeFilterTarget) return;

  const range = dateRanges[activeFilterTarget];
  if (!range.de || !range.ate) return;

  clearPeriodoRadios();

  const start = parsePickerDate(range.de);
  const end   = parsePickerDate(range.ate);

  end.setHours(23, 59, 59, 999);

  const filter = {
    mode: 'range',
    start: start.toISOString(),
    end: end.toISOString()
  };

  chartFilters[activeFilterTarget] = filter;

  updateFilterLabel(activeFilterTarget, {
    mode: 'range',
    label: `${formatDateBR(range.de)} → ${formatDateBR(range.ate)}`
  });

  dispatchLoad(activeFilterTarget, filter);
}

function syncDateInputs(section) {
  const range = dateRanges[section];

  dashDateDeInput.value = range.de || '';
  dashDateAteInput.value = range.ate || '';

  dashDateDeText.textContent = range.de
    ? formatDateBR(range.de)
    : '__/__/__';

  dashDateAteText.textContent = range.ate
    ? formatDateBR(range.ate)
    : '__/__/__';
}

// ================= Geração de gráficos =================
// ===== Visão Geral =====
async function loadOverview(filter = null) {
  const data = await window.api.dashboard.getOverview(filter);

  document.getElementById('totalGanhos').textContent =
    formatCurrency(data.ganhos);

  document.getElementById('totalCustos').textContent =
    formatCurrency(data.custos);

  document.getElementById('resultadoFinal').textContent =
    formatCurrency(data.resultado);

  document.getElementById('margemLucro').textContent =
    `${data.margem.toFixed(2)}%`;
}

async function loadGanhosCustosChart(filter = null) {
  const data = await window.api.dashboard.getGanhosCustos(filter);
  const isEmpty = !data.ganhos.some(v => v > 0) && !data.custos.some(v => v > 0);
  setChartEmpty('chartGanhosCustos', isEmpty);

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
        labels: data.labels,
        datasets: [
            {
                label: 'Ganhos',
                data: data.ganhos,
                backgroundColor: '#65a6fa',
                borderRadius: 5,
                borderSkipped: false,
            },
            {
                label: 'Custos',
                data: data.custos,
                backgroundColor: '#004aad',
                borderRadius: 5,
                borderSkipped: false,
            }
        ]
        },
        options: {
            interaction: {
                mode: 'index',
                intersect: false
            },
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

                        if (typeof label === 'string' && label.includes(',')) {
                            const [mesAbrev, ano] = label.split(',');

                            const map = {
                            Jan: 'Janeiro',
                            Fev: 'Fevereiro',
                            Mar: 'Março',
                            Abr: 'Abril',
                            Mai: 'Maio',
                            Jun: 'Junho',
                            Jul: 'Julho',
                            Ago: 'Agosto',
                            Set: 'Setembro',
                            Out: 'Outubro',
                            Nov: 'Novembro',
                            Dez: 'Dezembro'
                            };

                            return `${map[mesAbrev]} de ${ano}`;
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
}

// ===== Distribuição de Custos =====
async function loadDistribuicaoCustosChart(filter = null) {
    const data = await window.api.dashboard.getDistribuicaoCustos(filter);
    setChartEmpty('chartDistribuicaoCustos',!data.valores.some(v => v > 0));

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
            labels: data.labels.map(normalizeCategoria),
            datasets: [{
                data: data.valores,
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
}

// ===== Evolução Financeira =====
async function loadEvolucaoChart(filter = null) {
    const data = await window.api.dashboard.getEvolucao(filter);
    const isEmpty = !data.resultado.some(v => v !== 0);
    setChartEmpty('chartEvolucaoFinanceira', isEmpty);

    function renderLineLegend(chart, containerId) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';

        chart.data.datasets.forEach((ds, index) => {
            const item = document.createElement('div');
            item.className = 'legend-item';

            const dot = document.createElement('span');
            dot.className = 'legend-dot';
            dot.style.background = ds.borderColor || '#65a6fa';

            const label = document.createElement('span');
            label.textContent = ds.label;

            item.appendChild(dot);
            item.appendChild(label);

            item.onclick = () => {
            const visible = chart.isDatasetVisible(index);
            chart.setDatasetVisibility(index, !visible);

            item.style.opacity = visible ? '0.4' : '1';
            item.style.textDecoration = visible ? 'line-through' : 'none';

            chart.update('active');
            };

            container.appendChild(item);
        });
    }

    destroy('line1');
    charts.line1 = new Chart(
        document.getElementById('chartEvolucaoFinanceira'),
        {
            type: 'line',
            data: {
            labels: data.labels, // ex: ['2025-09', '2025-10']
            datasets: [{
                label: 'Resultado Mensal',
                data: data.resultado,
                tension: 0.3,
                // linha
                borderColor: '#6ce5e8',
                borderWidth: 3,
                // bolinhas
                pointRadius: 3,
                pointHoverRadius: 9,
                pointHitRadius: 20,
                pointBackgroundColor: '#6ce5e8',
                pointBorderColor: '#6ce5e8',
                pointBorderWidth: 2,
                backgroundColor: 'rgba(101,166,250,0.15)',
                fill: false
            }]
            },
            options: {
            responsive: true,
            interaction: {
                mode: 'nearest',
                intersect: true
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
                    titleFont: { size: 14, weight: '700' },
                    bodyFont: { size: 13, weight: '600' },
                    callbacks: {
                        title: (items) => {
                        const raw = items[0].label;
                        const [year, month] = raw.split('-');
                        const date = new Date(year, month - 1);

                        const mes = date.toLocaleDateString('pt-BR', { month: 'long' });
                        const mesFormatado = mes.charAt(0).toUpperCase() + mes.slice(1);

                        return `${mesFormatado} de ${year}`;
                        },
                        label: (ctx) => {
                        return ` R$ ${Number(ctx.raw).toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                        })}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                grid: {
                    display: false
                },
                ticks: {
                    color: '#111827',
                    font: { size: 15, weight: '600' },
                    callback: (value, index) => {
                    const raw = data.labels[index];
                    const [year, month] = raw.split('-');
                    const date = new Date(year, month - 1);

                    const mes = date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
                    const mesFormatado = mes.charAt(0).toUpperCase() + mes.slice(1);

                    return [mesFormatado, year]; 
                    }
                }
                },
                y: {
                grid: {
                    color: 'rgba(0,0,0,0.08)'
                },
                ticks: {
                    color: '#111827',
                    font: { size: 15, weight: '600' },
                    callback: v => v.toLocaleString('pt-BR')
                }
                }
            }
            }
        }
    );
    renderLineLegend(charts.line1, 'evolucaoLegend');

}

// ===== Saldo Acumulado =====
async function loadSaldoChart(filter = null) {
    const data = await window.api.dashboard.getSaldo(filter);
    const isEmpty = !data.valores.some(v => v !== 0);
    setChartEmpty('chartSaldoAcumulado', isEmpty);

    destroy('line2');
    charts.line2 = new Chart(
        document.getElementById('chartSaldoAcumulado'),
        {
            type: 'line',
            data: {
            labels: data.labels, // '2025-01'
            datasets: [{
                label: 'Saldo Acumulado',
                data: data.valores,
                tension: 0.3,
                borderWidth: 3,
                pointRadius: 6,
                pointHoverRadius: 8,
                pointHitRadius: 20,
                fill: false,

                // cor dinâmica por ponto
                borderColor: (ctx) => {
                const value = ctx.raw;
                return value >= 0 ? '#16a34a' : '#dc2626';
                },
                pointBackgroundColor: (ctx) => {
                const value = ctx.raw;
                return value >= 0 ? '#16a34a' : '#dc2626';
                },
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
            }]
            },
            options: {
            responsive: true,
            interaction: {
                mode: 'nearest',
                intersect: true
            },
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: false,
                },
                tooltip: {
                    backgroundColor: '#111827',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    padding: 14,
                    cornerRadius: 10,

                    titleFont: { size: 14, weight: '700' },
                    bodyFont: { size: 13, weight: '600' },

                    callbacks: {
                        title: (items) => {
                        const raw = items[0].label;
                        const [year, month] = raw.split('-');
                        const date = new Date(year, month - 1);
                        const mes = date.toLocaleDateString('pt-BR', { month: 'long' });
                        return `${mes.charAt(0).toUpperCase() + mes.slice(1)} de ${year}`;
                        },
                        label: (ctx) =>
                        ` R$ ${Number(ctx.raw).toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                        })}`
                    }
                }
            },
            scales: {
                x: {
                grid: {
                    display: false
                },
                ticks: {
                    color: '#111827',
                    font: { size: 15, weight: '600' },
                    callback: (value, index) => {
                    const raw = data.labels[index];
                    const [year, month] = raw.split('-');
                    const date = new Date(year, month - 1);
                    const mes = date
                        .toLocaleDateString('pt-BR', { month: 'short' })
                        .replace('.', '');
                    return [
                        mes.charAt(0).toUpperCase() + mes.slice(1),
                        year
                    ];
                    }
                }
                },
                y: {
                grid: {
                    color: (ctx) =>
                    ctx.tick.value === 0
                        ? 'rgba(0,0,0,0.35)' // linha zero destacada
                        : 'rgba(0,0,0,0.08)',
                    lineWidth: (ctx) => (ctx.tick.value === 0 ? 2 : 1)
                },
                ticks: {
                    color: '#111827',
                    font: { size: 15, weight: '600' },
                    callback: v => v.toLocaleString('pt-BR')
                }
                }
            }
            }
        }
    );
}

// ===== Maiores Custos =====
async function loadTopCustosTable(filter = null) {
    const data = await window.api.dashboard.getTopCustos(filter);
    const isEmpty = data.length === 0;
    setTableEmpty('topCustosSection', isEmpty);

    function normalizeCategoriaTabela(label) {
        const map = {
            taxa: 'Taxa',
            despesas: 'Despesa Processual',
            outros: 'Outros'
        };

        return map[label] || label;
    }

    function applyDashboardFocus() {
        const params = new URLSearchParams(window.location.search);
        const focus = params.get('focus');

        if (focus === 'topCustosSection') {
            const section = document.getElementById('topCustosSection');
            if (!section) return;

            section.scrollIntoView({
            behavior: 'instant',
            block: 'start'
            });
        }
    }

    const tbody = document.getElementById('topCustosTable');
    tbody.innerHTML = '';
    if (isEmpty) return;

    data.forEach(i => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
        <td>${i.titulo || '-'}</td>
        <td>${normalizeCategoriaTabela(i.categoria) || '-'}</td>
        <td>${formatCurrency(i.valor)}</td>
        <td>${new Date(i.createdAt).toLocaleDateString('pt-BR')}</td>
        `;
        tr.addEventListener('click', () => {
            window.location.href = `financeiroForm.html?id=${i.id}&tipo=custo&mode=view&from=dashboard&focus=topCustosSection`;
        });
        tbody.appendChild(tr);
    });

    applyDashboardFocus();
}

// ================= Inicialização =================
const defaultFilter = (() => {
  const now = new Date();
  return {
    mode: 'monthly',
    year: now.getFullYear(),
    month: now.getMonth() + 1
  };
})();

chartFilters.overview = defaultFilter;
chartFilters.ganhosCustos = null;
chartFilters.distribuicao = defaultFilter;
chartFilters.evolucao = null;
chartFilters.saldo = null;
chartFilters.topCustos = defaultFilter;

updateFilterLabel('overview', defaultFilter);
updateFilterLabel('ganhosCustos', null);
updateFilterLabel('distribuicao', defaultFilter);
updateFilterLabel('evolucao', null);
updateFilterLabel('saldo', null);
updateFilterLabel('topCustos', defaultFilter);

loadOverview(defaultFilter);
loadGanhosCustosChart(null);
loadDistribuicaoCustosChart(defaultFilter);
loadEvolucaoChart(null);
loadSaldoChart(null);
loadTopCustosTable(defaultFilter);