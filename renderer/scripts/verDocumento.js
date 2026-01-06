// renderiza arquivos e gerencia menu de opções (editar/excluir).
import { iconFor, openFileExtern, setupSharedModal, pickPaths } from './common/filesSection.js';
import { KEY } from './common/localStorage.js';

function selectOne(selector) {
  return document.querySelector(selector);
}
function selectMany(selector) {
  return Array.from(document.querySelectorAll(selector));
}


const headerDocumentTitleElement = selectOne('#headerDocumentTitle');
const headerDocumentDateElement = selectOne('#headerDocumentDate');
const editTitleSlot = document.getElementById('editTitleSlot');

const statusSelectorButton = selectOne('#statusSelectorButton');
const statusOptionsList = selectOne('#statusOptionsList');
const statusLabelElement = selectOne('#statusLabel');
const statusDotElement = selectOne('#statusDot');

const customerNameElement = selectOne('#customerName');
const documentDetailsTextarea = selectOne('#documentDetails');
const detalhesBox = document.querySelector('.annotation-box');

const documentFilesContainer = selectOne('#documentFilesContainer');

const resultValueElement = selectOne('#resultValue');
const lastCostList = selectOne('#lastCostsList');

const optionsKebabButton = selectOne('#optionsKebabButton');
const optionsKebabMenu = selectOne('#optionsKebabMenu');
const editDocumentButton = selectOne('#editDocumentButton');
const deleteDocumentButton = selectOne('#deleteDocumentButton');

const addFileFab = document.getElementById('addFileFab');

const salvarDocumentoButton = document.getElementById('salvarDocumento');

// Estado carregado
let loadedDocumentBundle = null;

// Modo edição
let isEditing = false;
let hasUnsavedChanges = false;


// =============== Leitura do ID via URL ===============
function getDocumentIdFromUrl() {
  const url = new URL(window.location.href);
  const idAsNumber = Number(url.searchParams.get('id'));
  return Number.isFinite(idAsNumber) ? idAsNumber : 0;
}

// botão status
function toggleElementVisibility(element, shouldShow) {
  element.style.display = shouldShow ? 'block' : 'none';
  element.setAttribute('aria-hidden', String(!shouldShow));
}

function setStatusVisual(statusText) {
  const statusMap = {
    'Pendente': { text: 'Pendente', dotClass: 'status-dot-pendente' },
    'Em Andamento': { text: 'Em andamento', dotClass: 'status-dot-andamento' },
    'Concluído': { text: 'Concluído', dotClass: 'status-dot-concluido' },
  };
  const info = statusMap[statusText] || statusMap['Pendente'];
  statusLabelElement.textContent = info.text;
  statusDotElement.className = `status-dot ${info.dotClass}`;
}

// formatação de data
function setCreatedDateInHeader(createdAtRaw) {
  if (!createdAtRaw) {
    headerDocumentDateElement.textContent = '--/--/----';
    return;
  }
  const parsedDate = new Date(createdAtRaw);
  if (isNaN(parsedDate.getTime())) {
    // Se vier em string já formatada, apenas mostra
    headerDocumentDateElement.textContent = String(createdAtRaw);
    return;
  }
  const day = String(parsedDate.getDate()).padStart(2, '0');
  const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
  const year = String(parsedDate.getFullYear());
  headerDocumentDateElement.textContent = `${day}/${month}/${year}`;
}

// conversão de moeda
function formatCurrencyToBRL(value) {
  const num = Number(value) || 0;

  try {
    return num.toLocaleString('pt-BR', { 
      style: 'currency', 
      currency: 'BRL',  
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  } catch {
    const normalized = num.toFixed(2).replace('.', ',');
    return `${normalized}`;
  }
}

// formatação de data
function formatDateBR(value){
  if(!value) return '--/--/----';
  const d = new Date(value);
  if(Number.isNaN(d.getTime())) return '--/--/----';
  const dd = String(d.getDate()).padStart(2,'0');
  const mm = String(d.getMonth() + 1).padStart(2,'0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function getLancamentoDate(l){
  return (
    l?.dataLancamento ||
    l?.criadoEm ||
    l?.createdAt ||
    l?.dataCriado ||
    l?.updatedAt ||
    null
  );
}

function renderCustosList(lista = [], label = 'custo'){
  if(!lastCostList) return;
  if(!Array.isArray(lista) || lista.length === 0){
    lastCostList.innerHTML = '<p>Nenhum custo registrado.</p>';
    return;
  }

  const ordered = [...lista].sort((a,b) => {
    const da = new Date(getLancamentoDate(a)).getTime() || 0;
    const db = new Date(getLancamentoDate(b)).getTime() || 0;
    return db - da;
  });

  const lastest = ordered.slice(0,10);
  lastCostList.innerHTML = lastest.map(t => {
    const valor = formatCurrencyToBRL(t?.valor || 0);
    const quando = formatDateBR(getLancamentoDate(t));
    return `<p style="margin-left: 10px">${valor} gasto no dia ${quando}</p>`;
  }).join('');
}

//
function renderFilesReadOnly(fileItems) {
  documentFilesContainer.innerHTML = '';

  if (!fileItems || fileItems.length === 0) {
    documentFilesContainer.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;text-align:center;color:#6b7280;padding:24px;font-weight:600;">
        Não existem arquivos adicionados.
      </div>`;
    return;
  }

  fileItems.forEach((fileItem) => {
    const fileRowElement = document.createElement('div');
    fileRowElement.className = 'files';

    const iconPath = iconFor(fileItem);

    fileRowElement.innerHTML = `
      <div class="delete-file-icon" title="Remover">
        <img src="assets/delete.png" alt="Remover">
      </div>
      <img src="${iconPath}" alt="" class="file-icon">
      <span class="tituloArquivo">${fileItem.nomeArquivo}</span>
    `;

    // abrir arquivo
    fileRowElement.querySelector('.file-icon').addEventListener('click', () => {
      if (fileItem?.urlArquivo) openFileExtern(fileItem.urlArquivo);
    });

    // excluir arquivo
    fileRowElement.querySelector('.delete-file-icon').addEventListener('click', async (e) => {
      e.stopPropagation();

      const confirm = await window.electronAPI.confirm(
        'Deseja excluir este arquivo?'
      );
      if (!confirm) return;

      try {
        await window.api.documentos.removeArquivo({
          idArquivo: fileItem.idArquivo,
        });
        await loadDocumentAndRender();
      } catch (err) {
        console.error(err);
        alert('Erro ao excluir arquivo');
      }
    });

    documentFilesContainer.appendChild(fileRowElement);
  });
}

const currentDocIdForFab = getDocumentIdFromUrl();
const addFileModal = setupSharedModal({
  storageKey: KEY.arquivos,
  modalIds: {
    modalId: 'file-preview-modal',
    titleId: 'file-title-input',
    saveBtnId: 'file-save-button',
    cancelBtnId: 'file-cancel-button',
    iconSelector: '#file-preview-modal .certidao-preview > img',
  },

  defaultTipo: 'arquivo',
  onAfterSave: async () => {
    // recarrega a lista de arquivos
    await loadDocumentAndRender();
  },
  persist: async (item) => {
    const payload = {
      idDocumento:  currentDocIdForFab,
      urlArquivo:   String(item.urlArquivo || '').trim(),
      tipoArquivo:  'arquivo',
      tituloArquivo:String(item.nomeArquivo || item.nomeOriginal || '').trim(),
    };
    await window.api.documentos.addArquivo(payload);
  },
});

addFileFab.addEventListener('click', async (e) => {
  e.preventDefault();
  e.stopPropagation();
  const paths = await pickPaths({ multi: true });
  if(!paths?.length) return;
  addFileModal.enqueuePaths(paths);
});

// =============== Carregar e renderizar documento ===============
async function loadDocumentAndRender() {
  const documentId = getDocumentIdFromUrl();
  if (!documentId) {
    alert('Documento inválido.');
    window.location.href = 'documentos.html';
    return;
  }

  // IPC esperado do processo principal:
  // window.api.documentos.getById(id) -> { documento, cliente, arquivos, lancamentos }
  try {
    loadedDocumentBundle = await window.api.documentos.getById(documentId);
  } catch (error) {
    console.error('Erro ao buscar documento:', error);
    alert('Não foi possível carregar o documento.');
    window.location.href = 'documentos.html';
    return;
  }

  if (!loadedDocumentBundle?.documento) {
    alert('Documento não encontrado.');
    window.location.href = 'documentos.html';
    return;
  }

  const { documento, cliente, arquivos = [] } = loadedDocumentBundle;

  // Cabeçalho: título e data (logo abaixo do título)
  headerDocumentTitleElement.textContent = documento?.nomeDocumento || `Documento ${documentId}`;
  setCreatedDateInHeader(documento?.dataCriado);

  // Cliente
  customerNameElement.textContent = cliente?.nome || '—';

  // Status
  setStatusVisual(documento?.statusDocumento || 'Pendente');

  // Detalhes (mantém textarea readonly conforme seu HTML atual)
  documentDetailsTextarea.value = documento?.detalhes || '';

  // Arquivos
  const somenteArquivos = Array.isArray(arquivos)
    ? arquivos.filter(a => String(a?.tipoArquivo).toLowerCase() === 'arquivo')
    : [];

  renderFilesReadOnly(somenteArquivos);

  // Resultado 
  const lancs = Array.isArray(loadedDocumentBundle?.lancamentos)
    ? loadedDocumentBundle.lancamentos
    : [];

  const servicos = lancs.filter(l => String(l?.tipoLancamento).toLowerCase() === 'servico');
  const taxas = lancs.filter(l => String(l?.tipoLancamento).toLowerCase() === 'taxa');
  const despesas = lancs.filter(l => String(l?.tipoLancamento).toLowerCase() === 'despesas');

  const totalServicos = servicos.reduce((acc, cur) => acc + (Number(cur?.valor) || 0), 0);
  const totalTaxas = taxas.reduce((acc, cur) => acc + (Number(cur?.valor) || 0), 0);
  const totalDespesas = despesas.reduce((acc, cur) => acc + (Number(cur?.valor) || 0), 0);
  const resultadoFinal = totalServicos - (totalTaxas + totalDespesas);

  resultValueElement.textContent = `Resultado: ${formatCurrencyToBRL(resultadoFinal)}`;
  if (resultadoFinal > 0) {
    resultValueElement.style.color = '#004aad'; 
  } else if (resultadoFinal < 0) {
    resultValueElement.style.color = '#dc3545'; 
  } else {
    resultValueElement.style.color = 'black'; 
  }

  renderCustosList([...taxas, ...despesas], 'custo');
}

// =============== Interações: Status (dropdown) ===============
statusSelectorButton.addEventListener('click', (event) => {
  event.stopPropagation();
  const isOpen = statusOptionsList.style.display === 'block';
  toggleElementVisibility(statusOptionsList, !isOpen);
  statusSelectorButton.setAttribute('aria-expanded', String(!isOpen));
});

document.addEventListener('click', (event) => {
  if (!statusOptionsList.contains(event.target) && !statusSelectorButton.contains(event.target)) {
    toggleElementVisibility(statusOptionsList, false);
    statusSelectorButton.setAttribute('aria-expanded', 'false');
  }
});

selectMany('.status-option').forEach((optionElement) => {
  optionElement.addEventListener('click', async () => {
    const newStatus = optionElement.getAttribute('data-status');
    toggleElementVisibility(statusOptionsList, false);
    statusSelectorButton.setAttribute('aria-expanded', 'false');

    // Atualiza visual imediatamente
    setStatusVisual(newStatus);

    // Persiste via IPC
    try {
      await window.api.documentos.updateStatus({ id: getDocumentIdFromUrl(), status: newStatus });
    } catch (error) {
      console.error('Falha ao atualizar status:', error);
      alert('Não foi possível atualizar o status.');
    }
  });
});

// edição de documento
document.addEventListener('click', async (e) => {
  if (!isEditing || !hasUnsavedChanges) return;

  // elementos que NÃO devem disparar o alerta
  const allowedSelectors = [
    '#editDocumentButton',
    '#salvarDocumento',
    '#headerDocumentTitle',
    '#documentDetails',
    '#file-preview-modal',
    '.file-preview-modal',
  ];

  const clickedAllowed = allowedSelectors.some(sel =>
    e.target.closest(sel)
  );

  if (clickedAllowed) return;

  // qualquer outro clique
  e.preventDefault();
  e.stopPropagation();

  const canContinue = await confirmExitIfEditing();

  // se escolheu "Não", simplesmente bloqueia
  if (!canContinue) return;
});

headerDocumentTitleElement.addEventListener('input', () => {
  if (isEditing) hasUnsavedChanges = true;
});

documentDetailsTextarea.addEventListener('input', () => {
  if (isEditing) hasUnsavedChanges = true;
});

function restoreDocumentView() {
  if (!loadedDocumentBundle?.documento) return;

  const { documento } = loadedDocumentBundle;

  headerDocumentTitleElement.textContent =
    documento.nomeDocumento || '';

  documentDetailsTextarea.value =
    documento.detalhes || '';

  setStatusVisual(documento.statusDocumento || 'Pendente');
}

function enterEditMode() {
  isEditing = true;
  hasUnsavedChanges = false;

  // mostrar slot do body
  editTitleSlot.style.display = 'block';

  // mover título + data para o body
  const row = editTitleSlot.querySelector('.document-title-row');
  row.append(
    headerDocumentTitleElement,
    headerDocumentDateElement
  );

  // garantir que fiquem visíveis
  headerDocumentTitleElement.style.display = '';
  headerDocumentDateElement.style.display = '';

  // ativar edição
  headerDocumentTitleElement.contentEditable = 'true';
  headerDocumentTitleElement.classList.add('editing-title');

  documentDetailsTextarea.removeAttribute('readonly');
  detalhesBox.classList.add('editing-box');

  salvarDocumentoButton.style.display = 'block';
}

function exitEditMode() {
  isEditing = false;
  hasUnsavedChanges = false;

  // esconder slot do body
  editTitleSlot.style.display = 'none';

  // devolver título + data ao header
  const headerCenter = document.querySelector('.document-view-header-center');
  headerCenter.append(
    headerDocumentTitleElement,
    headerDocumentDateElement
  );

  headerDocumentTitleElement.style.display = '';
  headerDocumentDateElement.style.display = '';

  // desativar edição
  headerDocumentTitleElement.contentEditable = 'false';
  headerDocumentTitleElement.classList.remove('editing-title');

  documentDetailsTextarea.setAttribute('readonly', true);
  detalhesBox.classList.remove('editing-box');

  salvarDocumentoButton.style.display = 'none';
}

async function confirmExitIfEditing() {
  if (!isEditing || !hasUnsavedChanges) return true;

  const shouldSave = await window.electronAPI.confirm(
    'Existem alterações ainda não salvas, deseja sair sem salva-las?'
  );

  if (!shouldSave) {
    if (salvarDocumentoButton) {
       salvarDocumentoButton.focus();
    }
    return false;
  }

  // Clicou em SIM → sai do modo edição (sem salvar, conforme sua regra atual)
  restoreDocumentView();
  exitEditMode();
  setEditIconToEdit();
  return false;
}


function setEditIconToClose() {
  editDocumentButton.src = 'assets/x.png';
  editDocumentButton.title = 'Cancelar edição';
  editDocumentButton.alt = 'Cancelar edição';
}

function setEditIconToEdit() {
  editDocumentButton.src = 'assets/edit.png';
  editDocumentButton.title = 'Editar';
  editDocumentButton.alt = 'Editar documento';
}

editDocumentButton.addEventListener('click', async (e) => {
  e.preventDefault();

  // Se NÃO está editando → entra em modo edição
  if (!isEditing) {
    enterEditMode();
    setEditIconToClose();
    return;
  }

  // Se JÁ está editando → cancela edição
  const canExit = await confirmExitIfEditing();
  if (!canExit) return;

  restoreDocumentView();
  exitEditMode();
  setEditIconToEdit();
});

salvarDocumentoButton.addEventListener('click', async () => {
  if (!isEditing) return;
  
  const statusDocumento = statusLabelElement.textContent.trim();

  await window.api.documentos.update({
    idDocumento: getDocumentIdFromUrl(),
    nomeDocumento: headerDocumentTitleElement.textContent.trim(),
    detalhes: documentDetailsTextarea.value.trim(),
    statusDocumento,
  });

  exitEditMode();
  setEditIconToEdit();
});

deleteDocumentButton.addEventListener('click', async () => {
  const documentId = getDocumentIdFromUrl();
  const userConfirmed = await window.electronAPI.confirm('Tem certeza que deseja excluir este documento? A ação não poderá ser desfeita');
  if (!userConfirmed) return;

  try {
    await window.api.documentos.delete(documentId);
    window.location.href = 'documentos.html';
  } catch (error) {
    console.error('Falha ao excluir o documento:', error);
    alert('Não foi possível excluir o documento.');
  }
});

// 
(() => {
  const url = new URL(window.location.href);
  const documentId = Number(url.searchParams.get('id') || 0);
  if (!documentId) return;

  const srv = document.querySelector('a[href="servicos.html"]');
  if (srv) srv.href = `servicos.html?ctx=view&id=${documentId}&tipo=servico`;
  
  const cert = document.querySelector('a[href="certidoes.html"]');
  if (cert) {
    cert.href = `certidoes.html?ctx=view&id=${documentId}`;
  }

  const taxas = document.querySelector('a[href="taxas.html"]');
  if (taxas) taxas.href = `taxas.html?ctx=view&id=${documentId}&tipo=taxa`;

  const despesas = document.querySelector('a[href="despesas.html"]');
  if (despesas) despesas.href = `despesas.html?ctx=view&id=${documentId}&tipo=despesas`;

  console.log('[verDocumento] links setados:', {
    id: documentId,
    servicosHref: srv?.href,
    certidoesHref: cert?.href,
    taxasHref: taxas?.href,
  });
})();


loadDocumentAndRender();
