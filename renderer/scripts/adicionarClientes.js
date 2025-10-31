// ===== referências existentes (mantidas) =====
const nome = document.getElementById('nome');
const tel = document.getElementById('tel');
const email  = document.getElementById('email');
const cadastroLabel = document.getElementById('cadastro-label');
const cadastroGeral = document.getElementById('cadastro-geral');
const tipoFisica = document.getElementById('tipo-fisica');
const tipoJuridica = document.getElementById('tipo-juridica');
const cep = document.getElementById('cep');
const cidade = document.getElementById('cidade');
const bairro = document.getElementById('bairro');
const rua = document.getElementById('rua');
const numero = document.getElementById('numero');
const complemento = document.getElementById('complemento');
const saveButton = document.getElementById('save-button');

const headerEl = document.querySelector('header');
const titleEl  = headerEl?.querySelector('.title') || document.querySelector('header .title');
const headerBackLink = document.getElementById('headerBackLink'); // seta ←
const headerCancelImg = document.getElementById('headerCancelImg'); // X (imagem)

const optionsKebabButton = document.getElementById('optionsKebabButton');
const optionsKebabMenu   = document.getElementById('optionsKebabMenu');

function norm(value) { return String(value ?? '').trim(); }
const onlyDigits = (v) => norm(v).replace(/\D+/g, '');

function setSaving(isSaving) {
  if (!saveButton) return;
  saveButton.disabled = isSaving;
  saveButton.textContent = isSaving ? 'Salvando…' : (isViewMode() ? 'Salvar alterações' : 'Salvar cliente');
}
function showError(msg) { alert(msg); }

function getTipoSelecionado() {
  if (tipoFisica?.checked) return 'fisica';
  if (tipoJuridica?.checked) return 'juridica';
  return '';
}

// mascaras
function maskCPF(v) {
  const d = onlyDigits(v).slice(0,11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0,3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6)}`;
  return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9,11)}`;
}
function maskCNPJ(v) {
  const d = onlyDigits(v).slice(0,14);
  if (d.length <= 2) return d;
  if (d.length <= 5)  return `${d.slice(0,2)}.${d.slice(2)}`;
  if (d.length <= 8)  return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8)}`;
  return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12,14)}`;
}
function maskCEP(v) {
  const d = onlyDigits(v).slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0,5)}-${d.slice(5,8)}`;
}
function maskPhoneBR(v) {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0,2)}) ${d.slice(2)}`;
  if (d.length === 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6,10)}`;
  if (d.length === 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7,11)}`;
  if (d.length > 6 && d.length < 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
  if (d.length > 6 && d.length < 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
  return d;
}

function applyCadastroMask() {
  const tipo = getTipoSelecionado();
  if (tipo === 'fisica') {
    cadastroGeral.value = maskCPF(cadastroGeral.value);
  } else if (tipo === 'juridica') {
    cadastroGeral.value = maskCNPJ(cadastroGeral.value);
  }
}

function updateCadastroLabelAndPlaceholder() {
  const tipo = getTipoSelecionado();
  if (cadastroLabel) {
    cadastroLabel.textContent = (tipo === 'juridica') ? 'CNPJ' : 'CPF';
  }
  if (cadastroGeral) {
    cadastroGeral.placeholder = (tipo === 'juridica') ? '00.000.000/0000-00' : '000.000.000-00';
    applyCadastroMask();
  }

  const nomeFieldset = document.querySelector('fieldset.annotation-box legend');
  if (nomeFieldset) {
    nomeFieldset.textContent = (tipo === 'juridica')
      ? 'Empresa'
      : 'Nome do Cliente';
  }
}

async function fillAddressFromCEP(cepStr) {
  const digits = onlyDigits(cepStr);
  if (digits.length !== 8) return;

  try {
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
    if (!res.ok) return;
    const data = await res.json();
    if (data?.erro) return;

    if (cidade && !norm(cidade.value))  cidade.value  = norm(data.localidade);
    if (bairro && !norm(bairro.value))  bairro.value  = norm(data.bairro);
    if (rua && !norm(rua.value))  rua.value  = norm(data.logradouro);
    if (complemento && !norm(complemento.value)) complemento.value = norm(data.complemento);
  } catch (e) {
    console.warn('[viacep] falhou:', e);
  }
}

function wireMasks() {
  tipoFisica?.addEventListener('change', updateCadastroLabelAndPlaceholder);
  tipoJuridica?.addEventListener('change', updateCadastroLabelAndPlaceholder);

  cadastroGeral?.addEventListener('input', applyCadastroMask);
  cadastroGeral?.addEventListener('blur', applyCadastroMask);

  tel?.addEventListener('input', () => { tel.value = maskPhoneBR(tel.value); });
  cep?.addEventListener('input', () => { cep.value = maskCEP(cep.value); });
  cep?.addEventListener('blur', () => { fillAddressFromCEP(cep.value); });
}

// deteção de modo view/create
function getClienteIdFromURL() {
  const params = new URLSearchParams(window.location.search);
  return Number(params.get('id') || 0);
}
let viewId = 0;           // id do cliente quando em view
let viewing = false;      // está na página em modo view?
let editing = false;      // está editando (após clicar em Editar)?
let currentData = null;

function isViewMode() { return viewing; }
function isEditing()  { return editing; }

// ===== NOVO: utilitários de modo leitura/edição =====
function setInputsDisabled(disabled) {
  const allInputs = [nome, tel, email, cadastroGeral, cep, cidade, bairro, rua, numero, complemento, tipoFisica, tipoJuridica];
  allInputs.forEach(el => { if (el) el.disabled = disabled; });
}
function showSaveButton(show) {
  if (!saveButton) return;
  saveButton.style.display = show ? '' : 'none';
  saveButton.textContent = isViewMode() ? 'Salvar alterações' : 'Salvar cliente';
}

if (optionsKebabButton && optionsKebabMenu) {
  // garante escondido no load
  optionsKebabMenu.classList.add('hidden');
  optionsKebabMenu.setAttribute('aria-hidden', 'true');
  optionsKebabButton.setAttribute('aria-expanded', 'false');

  optionsKebabButton.addEventListener('click', (e) => {
    e.stopPropagation();
    const isHidden = optionsKebabMenu.classList.contains('hidden');
    optionsKebabMenu.classList.toggle('hidden', !isHidden ? true : false);
    optionsKebabMenu.setAttribute('aria-hidden', isHidden ? 'false' : 'true');
    optionsKebabButton.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
  });

  document.addEventListener('click', (e) => {
    if (!optionsKebabMenu.contains(e.target) && !optionsKebabButton.contains(e.target)) {
      optionsKebabMenu.classList.add('hidden');
      optionsKebabMenu.setAttribute('aria-hidden', 'true');
      optionsKebabButton.setAttribute('aria-expanded', 'false');
    }
  });
}

if (editClienteButton) {
  editClienteButton.addEventListener('click', () => {
    optionsKebabMenu.setAttribute('aria-hidden', 'true');
    enterEditMode();
  });
}

if (deleteClienteButton) {
  deleteClienteButton.addEventListener('click', async () => {
    const ok = confirm('Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita.');
    if (!ok) return;
    try {
      await window.api.clientes.delete(viewId);
      window.location.href = 'clientes.html';
    } catch (err) {
      console.error('Erro ao excluir cliente:', err);
      alert('Não foi possível excluir o cliente.');
    }
  });
}

// ===== NOVO: preencher campos a partir do DB =====
function fillFormWithData(data) {
  const c = data?.cliente || {};
  const e = data?.endereco || {};

  if (nome) nome.value = norm(c.nome);
  const tipo = (c.tipoCliente === 'juridica') ? 'juridica' : 'fisica';
  if (tipoFisica)   tipoFisica.checked   = (tipo === 'fisica');
  if (tipoJuridica) tipoJuridica.checked = (tipo === 'juridica');
  updateCadastroLabelAndPlaceholder();

  if (cadastroGeral) cadastroGeral.value = norm(c.cadastroGeral);
  if (email)         email.value         = norm(c.email);
  if (tel)           tel.value           = norm(c.tel);

  if (cep)          cep.value          = norm(e.cep);
  if (cidade)       cidade.value       = norm(e.cidade);
  if (bairro)       bairro.value       = norm(e.bairro);
  if (rua)       rua.value       = norm(e.rua);
  if (numero)       numero.value       = norm(e.numero);
  if (complemento)  complemento.value  = norm(e.complemento);

  // aplica máscaras visuais nos campos já preenchidos
  if (tel)           tel.value          = maskPhoneBR(tel.value);
  if (cep)           cep.value          = maskCEP(cep.value);
  if (cadastroGeral) applyCadastroMask();
}

// ===== NOVO: transições de modo =====
function enterViewModeLoaded() {
  viewing = true;
  editing = false;

  // título opcional: não mexe no seu CSS/HTML
  if (titleEl && titleEl.textContent?.toLowerCase().includes('adicionar')) {
    titleEl.textContent = 'Cliente';
  }

  setInputsDisabled(true);
  showSaveButton(false);
}
function enterEditMode() {
  if (!isViewMode()) return;
  editing = true;
  setInputsDisabled(false);
  showSaveButton(true);
}

function updateHeaderIcons() {
  if (!headerBackLink || !headerCancelImg) return;

  // --- modo create ---
  if (!isViewMode()) {
    headerBackLink.style.display = 'none';
    headerCancelImg.style.display = '';
    return;
  }

  // --- modo view normal (somente leitura) ---
  if (isViewMode() && !isEditing()) {
    headerBackLink.style.display = '';
    headerCancelImg.style.display = 'none';
    return;
  }

  // --- modo edição dentro do view ---
  if (isViewMode() && isEditing()) {
    headerBackLink.style.display = 'none';
    headerCancelImg.style.display = '';
  }
}

// Clique no X
if (headerCancelImg) {
  headerCancelImg.addEventListener('click', async (e) => {
    e.preventDefault();

    // modo create → cancelar criação
    if (!isViewMode()) {
      const ok = await window.electronAPI.confirm('Deseja cancelar o cadastro deste cliente?');
      if (ok) window.location.href = 'clientes.html';
      return;
    }

    // modo edição dentro do view → apenas cancela edição
    if (isViewMode() && isEditing()) {
      if (currentData) fillFormWithData(currentData);  // restaura valores do banco
      setInputsDisabled(true);
      showSaveButton(false);
      editing = false;
      updateHeaderIcons();
    }
  });
}

// Clique na seta ←
if (headerBackLink) {
  headerBackLink.addEventListener('click', (e) => {
    e.preventDefault();
    window.location.href = 'clientes.html';
  });
}

document.addEventListener('DOMContentLoaded', () => {
  updateHeaderIcons();
});

// ===== GARANTE QUE O HEADER ESTEJA SINCRONIZADO =====
function refreshUIStates() {
  updateHeaderIcons();
  showSaveButton(isEditing() || !isViewMode());
}

// ajuste final: chame sempre que mudar de modo
const _oldEnterEditMode = enterEditMode;
enterEditMode = function() {
  _oldEnterEditMode();
  updateHeaderIcons();
};

const _oldEnterViewModeLoaded = enterViewModeLoaded;
enterViewModeLoaded = function() {
  _oldEnterViewModeLoaded();
  updateHeaderIcons();
};


// ===== fluxo de salvar (create vs update) =====
async function handleSalvar() {
  const nomeValue = norm(nome?.value);
  const telValue  = onlyDigits(tel?.value);
  const emailValue = norm(email?.value);
  const cadastroGeralValue = onlyDigits(cadastroGeral?.value);
  const tipoValue = getTipoSelecionado();

  const cepValue = onlyDigits(cep?.value);
  const cidadeValue = norm(cidade?.value);
  const bairroValue = norm(bairro?.value);
  const ruaValue = norm(rua?.value);
  const numeroValue = norm(numero?.value);
  const complementoValue = norm(complemento?.value);

  if (!nomeValue) {
    showError('Informe o nome do cliente.');
    nome?.focus();
    return;
  }

  try {
    setSaving(true);

    if (isViewMode()) {
      // UPDATE
      await api.clientes.update({
        cliente: {
          id: viewId,
          nome: nomeValue,
          tipo: tipoValue,
          cadastroGeral: cadastroGeralValue,
          email: emailValue,
          tel: telValue,
        },
        endereco: {
          cep: cepValue,
          cidade: cidadeValue,
          bairro: bairroValue,
          numero: numeroValue,
          complemento: complementoValue,
          rua: ruaValue,
        }
      });
      // após salvar, volta a "view" bloqueada de novo
      setInputsDisabled(true);
      showSaveButton(false);
      editing = false;
      alert('Cliente atualizado com sucesso.');
    } else {
      // CREATE (fluxo original)
      await api.clientes.create({
        cliente: {
          nome: nomeValue,
          tipo: tipoValue,
          cadastroGeral: cadastroGeralValue,
          email: emailValue,
          tel: telValue,
        },
        endereco: {
          cep: cepValue,
          cidade: cidadeValue,
          bairro: bairroValue,
          numero: numeroValue,
          complemento: complementoValue,
          rua: ruaValue,
        }
      });
      window.location.href = 'clientes.html';
    }
  } catch (err) {
    console.error('[clientes] erro ao salvar:', err);
    showError('Falha ao salvar. Tente novamente.');
  } finally {
    setSaving(false);
  }
}

// ===== boot =====
document.addEventListener('DOMContentLoaded', async () => {
  wireMasks();

  // Detecta se é view (tem ?id=)
  viewId = getClienteIdFromURL();
  viewing = !!viewId;

  if (viewing) {
    try {
      const data = await api.clientes.getById(viewId);
      if (!data) {
        showError('Cliente não encontrado.');
        window.location.href = 'clientes.html';
        return;
      }
      currentData = data; 
      fillFormWithData(data);
      enterViewModeLoaded();
    } catch (e) {
      console.error('[clientes] getById falhou:', e);
      showError('Não foi possível carregar o cliente.');
      window.location.href = 'clientes.html';
      return;
    }
  } else {
    // modo create permanece igual
    setInputsDisabled(false);
    showSaveButton(true);
  }

  // botão salvar (mesmo id no create e no view)
  if (!saveButton) {
    console.warn('[clientes] #save-button não encontrado.');
    return;
  }
  saveButton.addEventListener('click', (e) => {
    e.preventDefault();
    handleSalvar();
  });
});


