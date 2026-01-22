import { toBRL, toNumber } from './common/money.js';

// =======================
// Estado
// =======================
let currentTipo = 'Pagamento'; // Pagamento | Custo
let currentMetodoPagamento = 'pix';
let selectedCliente = null;
let selectedProcesso = null;
let processosDoCliente = [];
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
const processoSuggest = document.getElementById('processoSuggest');
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

  if (clienteInput.value.trim() === '') {
    // limpa estado do cliente
    selectedCliente = null;

    // limpa estado do processo
    selectedProcesso = null;
    processosDoCliente = [];

    // limpa UI
    processoInput.value = '';
    processoSuggest.style.display = 'none';
  }

  suggestTimer = setTimeout(async () => {
    if (q.length < 2) {
      clienteSuggest.style.display = 'none';
      return;
    }

    const clientes = await window.api.clientes.list({ query: q, limit: 6 }) || [];
    renderClienteSuggest(clientes);
  }, 250);
});

function renderClienteSuggest(list) {
  clienteSuggest.innerHTML = '';

  if (!list || !list.length) {
    clienteSuggest.style.display = 'none';
    return;
  }

  list.forEach(cli => {
    const el = document.createElement('div');
    el.className = 'client-suggest';

    const icon = document.createElement('span');
    icon.className = 'client-suggest-icon';
    icon.innerHTML = '<img src="assets/pessoa.png">';

    const label = document.createElement('span');
    label.className = 'client-suggest-label';
    label.textContent = cli.nome;

    el.append(icon, label);

    el.addEventListener('mousedown', ev => {
      ev.preventDefault();
      ev.stopPropagation();

      clienteInput.value = cli.nome;
      selectedCliente = {
        idCliente: cli.id,
        nome: cli.nome
      };

      selectedProcesso = null;
      processoInput.value = '';
      processoSuggest.style.display = 'none';

      processosDoCliente = [];
      clienteSuggest.style.display = 'none';
      markDirty();
    });

    clienteSuggest.appendChild(el);
  });

  clienteSuggest.style.display = 'block';
}


// =======================
// Sugestão de Processo
// =======================
processoInput.addEventListener('focus', async () => {
  if (!selectedCliente?.idCliente) return;

  const docs = await window.api.financeiro.listDocumentosByCliente(
    selectedCliente.idCliente
  );

  processosDoCliente = docs;
  renderDocumentoSuggest(docs);
});

processoInput.addEventListener('click', async () => {
  if (!selectedCliente?.idCliente) return;

  const docs = await window.api.financeiro.listDocumentosByCliente(
    selectedCliente.idCliente
  );

  processosDoCliente = docs;
  renderDocumentoSuggest(docs);
});

processoInput.addEventListener('input', async () => {
  const q = processoInput.value.trim().toLowerCase();

  if (q.length < 2) {
    processoSuggest.style.display = 'none';
    return;
  }

  // 🟢 CASO 1: cliente já selecionado
  if (selectedCliente?.idCliente) {
    if (!processosDoCliente.length) {
      processosDoCliente = await window.api.financeiro.listDocumentosByCliente(
        selectedCliente.idCliente
      );
    }

    const filtrados = processosDoCliente.filter(d =>
      d.nomeDocumento.toLowerCase().includes(q)
    );

    renderDocumentoSuggest(filtrados);
    return;
  }

  // 🔵 CASO 2: cliente NÃO selecionado
  const docs = await window.api.financeiro.searchDocumentos(q);
  renderDocumentoSuggest(docs);
});

processoSuggest.addEventListener('click', e => {
  e.stopPropagation();
});

function renderDocumentoSuggest(list) {
  processoSuggest.innerHTML = '';

  if (!list || !list.length) {
    processoSuggest.style.display = 'none';
    return;
  }

  list.forEach(doc => {
    const el = document.createElement('div');
    el.className = 'client-suggest';

    const icon = document.createElement('span');
    icon.className = 'client-suggest-icon';
    icon.innerHTML = '<img src="assets/documento.png">';

    const label = document.createElement('span');
    label.className = 'client-suggest-label';
    label.textContent = doc.nomeDocumento;

    el.append(icon, label);

    el.addEventListener('mousedown', async ev => {
      ev.preventDefault();
      ev.stopPropagation();

      processoInput.value = doc.nomeDocumento;
      selectedProcesso = doc;

      // Preencher cliente se não estiver selecionado
      if (!selectedCliente) {
        const cli = await window.api.financeiro.getClienteByDocumento(
          doc.idDocumento
        );

        if (cli) {
          clienteInput.value = cli.nome;
          selectedCliente = {
            idCliente: cli.idCliente,
            nome: cli.nome
          };

          processosDoCliente = await window.api.financeiro.listDocumentosByCliente(
            selectedCliente.idCliente
          );
        }
      }


      processoSuggest.style.display = 'none';
      markDirty();
    });

    processoSuggest.appendChild(el);
  });

  processoSuggest.style.display = 'block';
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
  processoSuggest.style.display = 'none';
  clienteSuggest.style.display = 'none';
});

// ======================
// Salvar
// ======================
salvarBtn?.addEventListener('click', async () => {
  const titulo = tituloInput.value.trim();
  const valor = toNumber(valorInput.value);

  if (!titulo || !valor) {
    await window.electronAPI.confirm('Título e valor são obrigatórios.');
    return;
  }

  if (currentTipo === 'Pagamento' && !selectedProcesso?.idDocumento) {
    await window.electronAPI.confirm(
      'Para pagamentos, é obrigatório selecionar um processo/documento.'
    );
    return;
  }

  const payload = {
    tipo: currentTipo,
    titulo,
    valor,
    detalhes: detalhesInput.value.trim() || null,
    idCliente: selectedCliente?.idCliente || null,
    idDocumento: selectedProcesso?.idDocumento || null,
    metodoPagamento: currentMetodoPagamento,
    tipoCusto: document.querySelector('input[name="tipoCusto"]:checked')?.value || null
  };

  await window.api.financeiro.create(payload);

  hasDirtyState = false;
  window.location.href = 'financeiro.html';
});