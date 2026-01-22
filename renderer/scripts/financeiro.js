// ================= Elementos =================
const listEl = document.getElementById('financeiroList');
const searchInput = document.querySelector('.search-box input');
const filterBtn = document.querySelector('.filter-btn');
const filterPanel = document.getElementById('filterPanel');

const calendarBtn = document.getElementById('calendarBtn');
const datePopup = document.getElementById('datePopup');
const clearBtn = document.getElementById('clearDateFilter');

const dateDeInput = document.getElementById('dateDe');
const dateAteInput = document.getElementById('dateAte');

const dateDeText = dateDeInput.nextElementSibling;
const dateAteText = dateAteInput.nextElementSibling;

const dateDeBox = dateDeInput.parentElement;
const dateAteBox = dateAteInput.parentElement;

// ================= Estado =================
let searchQuery = '';
let selectedTipos = new Set();
let selectedCategorias = new Set();
let periodoDias = null;
let financeiroData = [];

let dateDe = null;
let dateAte = null;

// ================= Utils =================
function formatDateBR(value) {
  if (!value) return '';

  let d;

  if (value instanceof Date) {
    d = value;
  } else if (typeof value === 'string' && value.includes('T')) {
    d = new Date(value); // ISO do banco
  } else if (typeof value === 'string') {
    d = parsePickerDate(value); // picker
  } else {
    return '';
  }

  if (!(d instanceof Date) || isNaN(d)) return '';

  return d.toLocaleDateString('pt-BR');
}

function parsePickerDate(value) {
  if (!value) return null;
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0); // meio-dia local
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
    const key = item.createdAt.split('T')[0]; // YYYY-MM-DD
    (acc[key] ||= []).push(item);
    return acc;
  }, {});
}

function normalizeCategoria(value) {
  if (!value) return '';
  const map = {
    despesas: 'Despesa Processual',
    taxa: 'Taxa',
    outros: 'Outros',
    servico: 'Serviço',
    pagamento: 'Pagamento'
  };
  return map[value.toLowerCase()] || value;
}

function normalizeItem(item) {
  return {
    ...item,
    titulo: item.titulo || '',
    documento: item.documento || '',
    cliente: item.cliente || '',
    categoria: item.categoria || '',
    tipo: item.tipo || 'custo',
    createdAt: item.createdAt || new Date().toISOString() // CHANGED
  };
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
  const orderedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

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
      const documento = item.documento || '';
      const cliente = item.cliente || '';
      const subtitle = [documento, cliente].filter(Boolean).join(' - ');

      card.innerHTML = `
        ${item.tipo === 'custo'
          ? `<div class="badge">${normalizeCategoria(item.categoria || 'Custo')}</div>`
          : ''
        }
        <div class="title">${item.titulo}</div>
        <div class="subtitle">${subtitle}</div>
        <div class="date">${formatDateBR(item.createdAt)}</div>

        <div class="value-wrapper">
          <div class="value-label">Valor</div>
          <div class="value">${formatCurrency(item.valor)}</div>
        </div>
      `;

      card.addEventListener('click', () => {
        window.location.href =
          `financeiroForm.html?id=${item.id}&tipo=${item.tipo}&mode=view`;
      });

      section.appendChild(card);
    });

    listEl.appendChild(section);
  });
}

// ================= Filtros =================
function applyFilters() {
  let data = [...financeiroData];

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    data = data.filter(i =>
      (i.titulo || '').toLowerCase().includes(q) ||
      (i.documento || '').toLowerCase().includes(q) ||
      (i.cliente || '').toLowerCase().includes(q)
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
    limit.setHours(0,0,0,0);
    data = data.filter(i => new Date(i.createdAt) >= limit);
  }

  if (dateDe || dateAte) {
    data = data.filter(i => {
      const itemDate = new Date(i.createdAt);
      const de = parsePickerDate(dateDe);
      const ate = parsePickerDate(dateAte || dateDe);
      if (!de || !ate) return false;

      ate.setHours(23,59,59,999);
      return itemDate >= de && itemDate <= ate;
    });
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
  datePopup.hidden = true;
  filterPanel.hidden = !filterPanel.hidden;
});

calendarBtn.addEventListener('click', e => {
  e.stopPropagation();
  filterPanel.hidden = true;
  datePopup.hidden = !datePopup.hidden;
});

document.addEventListener('click', e => {
  if (!filterPanel.contains(e.target) && !filterBtn.contains(e.target)) {
    filterPanel.hidden = true;
  }
  if (!datePopup.contains(e.target) && !calendarBtn.contains(e.target)) {
    datePopup.hidden = true;
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

// ================= Datas =================
dateDeBox.addEventListener('click', () => {
  dateDeInput.focus();
  dateDeInput.showPicker?.();
});

dateAteBox.addEventListener('click', () => {
  dateAteInput.focus();
  dateAteInput.showPicker?.();
});

dateDeInput.addEventListener('change', () => {
  dateDe = dateDeInput.value || null;
  dateAte = null;
  dateAteInput.value = '';
  periodoDias = null;

  const d = formatDateBR(dateDe);
  dateDeText.textContent =  dateDe ? formatDateBR(dateDe) : '__/__/__';

  applyFilters();
});

dateAteInput.addEventListener('change', () => {
  dateAte = dateAteInput.value || null;
  periodoDias = null;

  dateAteText.textContent = dateAte ? formatDateBR(dateAte) : '__/__/__';
  applyFilters();
});

clearBtn.addEventListener('click', () => {
  dateDe = null;
  dateAte = null;

  dateDeInput.value = '';
  dateAteInput.value = '';

  dateDeText.textContent = '__/__/__';
  dateAteText.textContent = '__/__/__';

  applyFilters();
});

// ================= Load =================
async function loadFinanceiro() {
  financeiroData = (await window.api.financeiro.list()).map(normalizeItem);
  financeiroData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  render(financeiroData);
}

loadFinanceiro();
