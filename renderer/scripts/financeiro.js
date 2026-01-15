const listEl = document.getElementById('financeiroList');
const searchInput = document.querySelector('.search-box input');
const filterBtn = document.querySelector('.filter-btn');
const filterPanel = document.getElementById('filterPanel');

let searchQuery = '';
let selectedTipos = new Set();
let periodoDias = null;
let financeiroData = [];

// ================= Utils =================
function formatDateBR(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

function groupByDate(items) {
  return items.reduce((acc, item) => {
    const dateKey = item.createdAt.split('T')[0];
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(item);
    return acc;
  }, {});
}

// ================= Render =================
function render(items) {
  listEl.innerHTML = '';

  if (!items.length) {
    listEl.innerHTML = `
      <div style="text-align:center;padding:24px;color:#6b7280;font-weight:600">
        Nenhum lançamento encontrado.
      </div>`;
    return;
  }

  const grouped = groupByDate(items);
  const orderedDates = Object.keys(grouped).sort((a,b) => new Date(b) - new Date(a));

  orderedDates.forEach(date => {
    const section = document.createElement('div');
    section.className = 'financeiro-section';

    section.innerHTML = `
      <div class="financeiro-section">${formatDateBR(date)}</div>
      <div class="financeiro-section-content"></div>
    `;

    grouped[date].forEach(item => {
      const card = document.createElement('div');
      card.className = `financeiro-card ${item.tipo}`;

      card.innerHTML = `
        ${item.tipo === 'custo'
          ? `<div class="badge">${item.categoria || 'Custo'}</div>`
          : ''
        }

        <div class="title">${item.titulo}</div>
        <div class="subtitle">${item.documento} - ${item.cliente}</div>
        <div class="date">${formatDateBR(item.createdAt)}</div>

        <div class="value-wrapper">
            <div class="value-label">Valor</div>
             <div class="value">${formatCurrency(item.valor)}</div>
        </div>
      `;

      section.appendChild(card);
    });

    listEl.appendChild(section);
  });
}

// ================= Filtro =================
function applyFilters() {
  let data = [...financeiroData];

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    data = data.filter(i =>
      i.titulo.toLowerCase().includes(q) ||
      i.documento.toLowerCase().includes(q) ||
      i.cliente.toLowerCase().includes(q)
    );
  }

  if (selectedTipos.size) {
    data = data.filter(i => selectedTipos.has(i.tipo));
  }

  if (periodoDias) {
    const limit = new Date();
    limit.setDate(limit.getDate() - periodoDias);
    data = data.filter(i => new Date(i.createdAt) >= limit);
  }

  render(data);
}

// ================= Eventos =================
let debounce = null;
searchInput.addEventListener('input', () => {
  searchQuery = searchInput.value.trim();
  clearTimeout(debounce);
  debounce = setTimeout(applyFilters, 200);
});

filterBtn.addEventListener('click', e => {
  e.stopPropagation();
  filterPanel.hidden = !filterPanel.hidden;
  filterBtn.setAttribute('aria-expanded', String(!filterPanel.hidden));
});

document.addEventListener('click', e => {
  if (!filterPanel.contains(e.target) && !filterBtn.contains(e.target)) {
    filterPanel.hidden = true;
    filterBtn.setAttribute('aria-expanded', 'false');
  }
});

filterPanel.addEventListener('change', e => {
  if (e.target.type === 'checkbox') {
    e.target.checked
      ? selectedTipos.add(e.target.value)
      : selectedTipos.delete(e.target.value);
  }

  if (e.target.type === 'radio') {
    periodoDias = Number(e.target.value);
  }

  applyFilters();
});

// ================= Load =================
async function loadFinanceiro() {
  // IPC / API esperada
  financeiroData = [
  {
    id: 1,
    tipo: 'pagamento',
    titulo: 'Pagamento referente a processo',
    valor: 120,
    documento: 'Processo 1',
    cliente: 'João Paulo',
    createdAt: '2025-12-12T10:00:00'
  },
  {
    id: 2,
    tipo: 'custo',
    titulo: 'Despesa processual',
    valor: 45,
    documento: 'Processo 1',
    cliente: 'João Paulo',
    createdAt: '2025-1-13T08:00:00',
    categoria: 'Taxa'
  }
];
render(financeiroData);

}

loadFinanceiro();
