import { toBRL, toNumber } from './common/money.js';

// ==================================
// Identificar modo de leitura/edição
// ===================================
function getParams() {
  const url = new URL(window.location.href);
  return {
    id: Number(url.searchParams.get('id')),
    tipo: url.searchParams.get('tipo'), // pagamento | custo
    mode: url.searchParams.get('mode'),
    from: url.searchParams.get('from'),           // processo | financeiro
    processoId: Number(url.searchParams.get('processoId'))
  };
}

// =======================
// Estado
// =======================
let currentTipo = 'Pagamento'; // Pagamento | Custo
let currentMetodoPagamento = 'pix';
let selectedCliente = null;
let selectedProcesso = null;
let processosDoCliente = [];
let hasDirtyState = false;
let isEditing = false;
let originalData = null;

// =======================
// Elementos
// =======================

// Ações de documento (editar / excluir / voltar)
const editarBtn = document.getElementById('editFinanceiroButton');
const excluirBtn = document.getElementById('deleteFinanceiroButton');
const backBtn = document.querySelector('.back-button');
const backIcon = backBtn.querySelector('img');

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

// Boxes
const annotationBoxes = document.querySelectorAll('.annotation-box');

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
  if (!isEditing) return;
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

function setEditIconToEdit() {
  editarBtn.src = 'assets/edit.png';
  editarBtn.title = 'Editar';
}

function setEditIconToClose() {
  editarBtn.src = 'assets/x.png';
  editarBtn.title = 'Cancelar edição';
}

function setBackAsText() {
  backBtn.innerHTML = '&#x25C0;';
  backBtn.title = 'Voltar';
}

function setBackAsCloseIcon() {
  backBtn.innerHTML = '<img src="assets/x.png" alt="Cancelar">';
  backBtn.title = 'Cancelar';
}

function updateHeaderByState() {
  const { id } = getParams();

  // CREATE
  if (!id) {
    editarBtn.style.display = 'none';
    excluirBtn.style.display = 'none';
    backBtn.title = 'Cancelar';

    setBackAsCloseIcon();
    return;
  }

  // VIEW
  if (!isEditing) {
    editarBtn.style.display = 'block';
    excluirBtn.style.display = 'block';
    backBtn.title = 'Voltar';

    setBackAsText();
    setEditIconToEdit();
    return;
  }

  // EDIT
  editarBtn.style.display = 'block';
  excluirBtn.style.display = 'block';
  backBtn.title = 'Cancelar edição';
}

function restoreOriginalData() {
  if (!originalData) return;

  tituloInput.value = originalData.titulo;
  valorInput.value = originalData.valor;
  detalhesInput.value = originalData.detalhes;

  selectedCliente = originalData.selectedCliente;
  selectedProcesso = originalData.selectedProcesso;

  clienteInput.value = selectedCliente?.nome || '';
  processoInput.value = selectedProcesso?.nomeDocumento || '';


  if (originalData.metodoPagamento) {
    currentMetodoPagamento = originalData.metodoPagamento;
    metodoLabel.textContent = originalData.metodoPagamento;
  }

  if (originalData.tipoCusto) {
    document
      .querySelector(`input[name="tipoCusto"][value="${originalData.tipoCusto}"]`)
      ?.click();
  }
}

async function preloadFromProcess() {
  const { from, processoId } = getParams();
  if (from !== 'processo' || !processoId) return;

  const doc = await window.api.documentos.getById(processoId);
  if (!doc?.documento || !doc?.cliente) return;

  selectedCliente = {
    idCliente: doc.documento.idCliente,
    nome: doc.cliente.nome
  };

  selectedProcesso = {
    idDocumento: doc.documento.idDocumento,
    nomeDocumento: doc.documento.nomeDocumento
  };

  clienteInput.value = selectedCliente.nome;
  processoInput.value = selectedProcesso.nomeDocumento;

  lockFields();
}

// =======================
// Botão voltar
// ======================
function redirectBack() {
  const { from, processoId } = getParams();

  if (from === 'processo' && processoId) {
    window.location.href = `verDocumento.html?id=${processoId}`;
    return;
  }

  if (from === 'dashboard') {
    window.location.href = `dashboard.html?focus=topCustosSection`;
    return;
  }

  window.location.href = 'financeiro.html';
}

backBtn.addEventListener('click', async e => {
  e.preventDefault();

  const { id } = getParams();

  // CREATE
  if (!id) {
    if (!hasDirtyState) {
      redirectBack();
      return;
    }

    e.preventDefault();
    const ok = await window.electronAPI.confirm(
      'Deseja cancelar sem salvar?'
    );
    if (ok) redirectBack();
    return;
  }

  // EDIT
  if (isEditing) {
    e.preventDefault();

    if (hasDirtyState) {
      const ok = await window.electronAPI.confirm(
        'Deseja cancelar a edição? As alterações não serão salvas.'
      );
      if (!ok) {
        salvarBtn.focus();
        return;
      }
    }

    isEditing = false;
    exitEditMode();
    restoreOriginalData();
    originalData = null;
    setEditIconToEdit();
    removeEditVisuals();
    updateHeaderByState();
    return;
  }

  // VIEW
  redirectBack();
});

// =======================
// Modo view
// =======================
function enterViewMode() {
  // inputs
  tituloInput.setAttribute('readonly', true);
  valorInput.setAttribute('readonly', true);
  detalhesInput.setAttribute('readonly', true);

  // dropdowns
  tipoBtn.style.pointerEvents = 'none';
  metodoBtn.style.pointerEvents = 'none';

  // radios custo
  tipoCustoRadios.forEach(r => {
    document.querySelector('.tipo-custo')?.classList.add('view-mode');
  });

  // salvar escondido
  salvarBtn.style.display = 'none';

  // limpar dirty
  hasDirtyState = false;
}

// =======================
// Modo edição
// =======================
if (editarBtn) {
  editarBtn.addEventListener('click', async () => {
    if (!isEditing) {
      originalData = {
        titulo: tituloInput.value,
        valor: valorInput.value,
        detalhes: detalhesInput.value,
        metodoPagamento: currentMetodoPagamento,
        tipoCusto: document.querySelector('input[name="tipoCusto"]:checked')?.value || null,
        selectedCliente: selectedCliente
          ? { ...selectedCliente }
          : null,
        selectedProcesso: selectedProcesso
          ? { ...selectedProcesso }
          : null
      };

      isEditing = true;
      enterEditMode();
      setEditIconToClose();
      updateHeaderByState();
      return;
    }

    // CANCELAR EDIÇÃO (X)
    if (hasDirtyState) {
      const ok = await window.electronAPI.confirm(
        'Existem alterações não salvas. Deseja cancelar a edição?'
      );
      if (!ok) {
        salvarBtn.focus();
        return;
      }
    }

    isEditing = false;
    restoreOriginalData();
    originalData = null;

    exitEditMode();
    setEditIconToEdit();
    removeEditVisuals();
    updateHeaderByState();
  });
}

function enterEditMode() {
  document.body.classList.add('editing-mode');

  tituloInput.removeAttribute('readonly');
  tituloInput.classList.add('editing-box');
  valorInput.removeAttribute('readonly');
  detalhesInput.removeAttribute('readonly');

  metodoBtn.style.pointerEvents = 'auto';
  document.querySelector('.tipo-custo')?.classList.remove('view-mode');

  salvarBtn.style.display = 'block';

  annotationBoxes.forEach(box => {
    box.classList.add('editing-box');
  });
}

function removeEditVisuals() {
  document.body.classList.remove('editing-mode');

  tituloInput.classList.remove('editing-box');

  annotationBoxes.forEach(box => {
    box.classList.remove('editing-box');
  });
}

function exitEditMode() {
  enterViewMode();
  hasDirtyState = false;
}

// =======================
// Excluir e Editar
// =======================
if (excluirBtn) {
  excluirBtn.addEventListener('click', async () => {
    const { id } = getParams();

    const ok = await window.electronAPI.confirm(
      'Tem certeza que deseja excluir?'
    );

    if (!ok) return;

    await window.api.financeiro.delete({ id, tipo: currentTipo });

    window.location.href = 'financeiro.html';
  });
}

// =======================
// Tipo Pagamento / Custo
// =======================
function closeAllDropdowns() {
  tipoDropdown.style.display = 'none';
  metodoDropdown.style.display = 'none';
  processoSuggest.style.display = 'none';
  clienteSuggest.style.display = 'none';
}

tipoBtn.addEventListener('click', e => {
  e.stopPropagation();
  closeAllDropdowns();
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
  closeAllDropdowns();
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

  closeAllDropdowns(); // Fechar outros dropdowns antes de abrir este

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

  closeAllDropdowns();

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

    el.addEventListener('mousedown', ev => {
      ev.preventDefault();
      ev.stopPropagation();

      processoInput.value = doc.nomeDocumento;
      selectedProcesso = doc;

      // SETA O CLIENTE IMEDIATAMENTE
      if (!selectedCliente && doc.idCliente) {
        selectedCliente = {
          idCliente: doc.idCliente,
          nome: doc.clienteNome || ''
        };

        clienteInput.value = selectedCliente.nome;
      }

      processoSuggest.style.display = 'none';
      markDirty();
    });

    processoSuggest.appendChild(el);
  });

  processoSuggest.style.display = 'block';
}

// =======================
// Fechar dropdowns ao clicar fora
// =======================
document.addEventListener('click', () => {
  closeAllDropdowns();
});

// =======================
// Modo view
// =======================
function lockFields() {
  clienteInput.setAttribute('readonly', true);
  processoInput.setAttribute('readonly', true);

  clienteInput.classList.add('readonly');
  processoInput.classList.add('readonly');
}

function normalizeTipo(tipo) {
  if (!tipo) return 'Pagamento';
  return tipo.toLowerCase() === 'custo'
    ? 'Custo'
    : 'Pagamento';
}

function updateDot() {
  tipoDot.className =
  currentTipo === 'Pagamento'
    ? 'status-dot status-dot-pagamento'
    : 'status-dot status-dot-custo';
}

async function loadLancamento() {
  const { id, tipo, mode } = getParams()
  
  const lanc = await window.api.financeiro.getById({ id, tipo });

  if (!lanc) {
    await window.electronAPI.confirm({
      message: 'Lançamento não encontrado.',
      single: true
    });
    window.location.href = 'financeiro.html';
    return;
  }

  // tipo
  currentTipo = normalizeTipo(lanc.tipo);
  tipoLabel.textContent = currentTipo;

  toggleTipoFields();
  updateSalvarButtonLabel();
  updateDot();

  // campos
  tituloInput.value = lanc.titulo;
  valorInput.value = toBRL(lanc.valor);
  detalhesInput.value = lanc.detalhes || '';

  clienteInput.value = lanc.clienteNome;
  processoInput.value = lanc.documentoNome;

  selectedCliente = {
    idCliente: lanc.idCliente,
    nome: lanc.clienteNome
  };

  selectedProcesso = {
    idDocumento: lanc.idDocumento,
    nomeDocumento: lanc.documentoNome
  };

  currentMetodoPagamento = lanc.metodoPagamento;
  metodoLabel.textContent = lanc.metodoPagamento;

  if (lanc.tipoCusto) {
    document
      .querySelector(`input[name="tipoCusto"][value="${lanc.tipoCusto}"]`)
      ?.click();
  }

  lockFields();

  if (mode === 'view') {
    enterViewMode();
  }
}

// ======================
// Salvar
// ======================
salvarBtn?.addEventListener('click', async () => {
  const titulo = tituloInput.value.trim();
  const valor = toNumber(valorInput.value);

  console.log('DEBUG SAVE', {
    currentTipo,
    selectedCliente,
    selectedProcesso
  });

  if (!titulo || !valor) {
    await window.electronAPI.confirm({
      message: 'Título e valor são obrigatórios.',
      single: true
    });
    return;
  }

  if ( currentTipo === 'Pagamento' && 
    (!selectedCliente?.idCliente || !selectedProcesso?.idDocumento)
  ) {
    await window.electronAPI.confirm({
      message: 'Para pagamentos, é obrigatório selecionar cliente e processo/documento.',
      single: true
    });
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

  if (id) {
    await window.api.financeiro.update({
      id,
      tipo: currentTipo, 
      ...payload
    });
  } else {
    await window.api.financeiro.create({
      tipo: currentTipo,
      ...payload
    });
  }

  hasDirtyState = false;
  redirectBack();
});

const { id, mode } = getParams();

if (id) {
  loadLancamento();
} else {
  // modo criação
  isEditing = false;
  preloadFromProcess();
  removeEditVisuals();
  salvarBtn.style.display = 'block';
}


updateHeaderByState();