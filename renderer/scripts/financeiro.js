const listEl = document.getElementById('financeiroList');
const searchInput = document.querySelector('.search-box input');
const filterBtn = document.querySelector('.filter-btn');
const filterPanel = document.getElementById('filterPanel');

let searchQuery = '';
let selectedTipos = new Set();
let selectedCategorias = new Set();
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
    if (!item.createdAt) return acc;

    const dateKey = String(item.createdAt).split('T')[0];
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(item);
    return acc;
  }, {});
}

function normalizeCategoria(value) {
  if (!value) return '';

  const map = {
    'despesas': 'Despesa Processual',
    'taxa': 'Taxa',
    'servico': 'Serviço',
    'pagamento': 'Pagamento'
  };

  return map[value.toLowerCase()] || value;
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
          ? `<div class="badge">${normalizeCategoria(item.categoria || 'Custo')}</div>`
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

  if (selectedCategorias.size) {
    data = data.filter(i =>
      i.categoria && selectedCategorias.has(i.categoria.toLowerCase())
    );
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
  if (e.target.type === 'checkbox' && e.target.name === 'tipo') {
    e.target.checked
      ? selectedTipos.add(e.target.value)
      : selectedTipos.delete(e.target.value);
  }

  if (e.target.type === 'checkbox' && e.target.name === 'categoria') {
    e.target.checked
      ? selectedCategorias.add(e.target.value)
      : selectedCategorias.delete(e.target.value);
  }

  if (e.target.type === 'radio') {
    periodoDias = e.target.value ? Number(e.target.value) : null;
  }

  applyFilters();
});

// ================= Load =================
async function loadFinanceiro() {
  // IPC / API esperada
  financeiroData = await window.api.financeiro.list();
  // Ordenação principal
  financeiroData.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
  render(financeiroData);
}

loadFinanceiro();
