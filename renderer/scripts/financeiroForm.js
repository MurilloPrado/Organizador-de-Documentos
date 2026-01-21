import { toBRL, toNumber } from './common/money.js';

// =======================
// Estado
// =======================
let currentTipo = 'Pagamento'; // Pagamento | Custo
let currentMetodoPagamento = 'pix';
let selectedCliente = null;
let selectedProcesso = null;
let hasDirtyState = false;

// =======================
// Elementos
// =======================

// Tipo (Pagamento / Custo)
const tipoBtn = document.getElementById('tipoSelectorButton');
const tipoLabel = document.getElementById('statusLabel');
const tipoDot = document.getElementById('statusDot');
const tipoDropdown = document.getElementById('tipoOptionsList');

// Método de pagamento
const metodoBtn = document.getElementById('metodoPagamentoButton');
const metodoLabel = document.getElementById('metodoPagamentoLabel');
const metodoDropdown = document.getElementById('metodoPagamentoList');

// Inputs
const tituloInput = document.getElementById('tituloInput');
const clienteInput = document.getElementById('clienteInput');
const processoInput = document.getElementById('processoInput');
const valorInput = document.getElementById('valor');
const detalhesInput = document.getElementById('detalhes');

// Custo
const tipoCustoRadios = document.querySelectorAll('input[name="tipoCusto"]');

// Autocomplete
const clienteSuggest = document.getElementById('clienteSuggest');

// Salvar
const salvarBtn = document.getElementById('salvarDocumento');

// =======================
// Utils
// =======================
function markDirty() {
  hasDirtyState = true;
}

[
  tituloInput,
  clienteInput,
  processoInput,
  valorInput,
  detalhesInput
].forEach(el => el?.addEventListener('input', markDirty));

if (valorInput) {
  valorInput.addEventListener('input', () => {
    const digitos = valorInput.value.replace(/\D/g, '');
    const numero = Number(digitos) / 100;
    valorInput.value = toBRL(numero);
    markDirty();
  });
}


// =======================
// Tipo Pagamento / Custo
// =======================
tipoBtn.addEventListener('click', e => {
  e.stopPropagation();
  tipoDropdown.style.display =
    tipoDropdown.style.display === 'block' ? 'none' : 'block';
});

tipoDropdown.querySelectorAll('.status-option').forEach(opt => {
  opt.addEventListener('click', () => {
    currentTipo = opt.dataset.status;
    tipoLabel.textContent = currentTipo;

    tipoDot.className =
      currentTipo === 'Pagamento'
        ? 'status-dot status-dot-pagamento'
        : 'status-dot status-dot-custo';

    toggleTipoFields();
    updateSalvarButtonLabel();
    tipoDropdown.style.display = 'none';
    markDirty();
  });
});

function toggleTipoFields() {
  const tipoCusto = document.querySelector('.tipo-custo');
  const metodoSection = metodoBtn.closest('.status-section');

  if (currentTipo === 'Pagamento') {
    tipoCusto.style.display = 'none';
    metodoSection.style.display = 'block';
  } else {
    tipoCusto.style.display = 'block';
    metodoSection.style.display = 'none';
  }
}

toggleTipoFields();

function updateSalvarButtonLabel() {
  if (!salvarBtn) return;

  if (currentTipo === 'Pagamento') {
    salvarBtn.textContent = 'Salvar pagamento';
  } else {
    salvarBtn.textContent = 'Salvar custo';
  }
}

// =======================
// Método de pagamento
// =======================
metodoBtn.addEventListener('click', e => {
  e.stopPropagation();
  metodoDropdown.style.display =
    metodoDropdown.style.display === 'block' ? 'none' : 'block';
});

metodoDropdown.querySelectorAll('.status-option').forEach(opt => {
  opt.addEventListener('click', () => {
    currentMetodoPagamento = opt.dataset.status;
    metodoLabel.textContent = opt.textContent.trim();
    metodoDropdown.style.display = 'none';
    markDirty();
  });
});

// =======================
// Autocomplete Cliente
// =======================
let suggestTimer = null;

clienteInput.addEventListener('input', () => {
  const q = clienteInput.value.trim();
  clearTimeout(suggestTimer);

  suggestTimer = setTimeout(async () => {
    if (q.length < 2) {
      clienteSuggest.style.display = 'none';
      return;
    }

    const names = await window.api.clientes.searchPrefix(q) || [];
    renderClienteSuggest(names.slice(0, 6));
  }, 250);
});

function renderClienteSuggest(list) {
  clienteSuggest.innerHTML = '';

  if (!list || !list.length) {
    clienteSuggest.style.display = 'none';
    return;
  }

  list.forEach(nome => {
    const el = document.createElement('div');
    el.className = 'client-suggest';

    const icon = document.createElement('span');
    icon.className = 'client-suggest-icon';
    icon.innerHTML = '<img src="assets/pessoa.png">';

    const label = document.createElement('span');
    label.className = 'client-suggest-label';
    label.textContent = nome;

    el.append(icon, label);

    el.addEventListener('mousedown', ev => {
      ev.preventDefault();
      ev.stopPropagation();
      clienteInput.value = nome;
      selectedCliente = nome;
      clienteSuggest.style.display = 'none';
      markDirty();
    });

    clienteSuggest.appendChild(el);
  });

  clienteSuggest.style.display = 'block';
}

// =======================
// Cancelar (X)
// =======================
document.querySelector('[data-action="sair"]')?.addEventListener('click', async e => {
  if (!hasDirtyState) return;

  e.preventDefault();
  const ok = await window.electronAPI.confirm(
    'Existem dados preenchidos. Deseja cancelar sem salvar?'
  );

  if (ok) window.location.href = 'financeiro.html';
});

// =======================
// Fechar dropdowns ao clicar fora
// =======================
document.addEventListener('click', () => {
  tipoDropdown.style.display = 'none';
  metodoDropdown.style.display = 'none';
});

salvarBtn?.addEventListener('click', async () => {
  const titulo = tituloInput.value.trim();
  const valor = toNumber(valorInput.value);

  if (!titulo || !valor) {
    await window.electronAPI.confirm('Título e valor são obrigatórios.');
    return;
  }

  // aqui depois entra:
  // - pagamento → tabela pagamentos
  // - custo → tabela lancamentos

  console.log({
    tipo: currentTipo,
    titulo,
    valor,
    cliente: selectedCliente,
    processo: selectedProcesso,
    metodoPagamento: currentMetodoPagamento
  });

  hasDirtyState = false;
});
