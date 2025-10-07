// scripts/verDocumento.js
// Página "verDocumento": carrega dados do documento, controla dropdown de status,
// renderiza arquivos e gerencia menu de opções (editar/excluir).
import { iconFor, openFileExtern } from './common/filesSection.js';


// =============== Utilidades de seleção ===============
function selectOne(selector) {
  return document.querySelector(selector);
}
function selectMany(selector) {
  return Array.from(document.querySelectorAll(selector));
}

// =============== Referências de UI ===============
const headerDocumentTitleElement = selectOne('#headerDocumentTitle');
const headerDocumentDateElement = selectOne('#headerDocumentDate');

const statusSelectorButton = selectOne('#statusSelectorButton');
const statusOptionsList = selectOne('#statusOptionsList');
const statusLabelElement = selectOne('#statusLabel');
const statusDotElement = selectOne('#statusDot');

const customerNameElement = selectOne('#customerName');
const documentDetailsTextarea = selectOne('#documentDetails');

const documentFilesContainer = selectOne('#documentFilesContainer');

const resultValueElement = selectOne('#resultValue');

const optionsKebabButton = selectOne('#optionsKebabButton');
const optionsKebabMenu = selectOne('#optionsKebabMenu');
const editDocumentButton = selectOne('#editDocumentButton');
const deleteDocumentButton = selectOne('#deleteDocumentButton');

// =============== Estado local ===============
let loadedDocumentBundle = null;

// =============== Leitura do ID via URL ===============
function getDocumentIdFromUrl() {
  const url = new URL(window.location.href);
  const idAsNumber = Number(url.searchParams.get('id'));
  return Number.isFinite(idAsNumber) ? idAsNumber : 0;
}

// =============== Helpers visuais e formatações ===============
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

function formatCurrencyToBRL(value) {
  try {
    return (value ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  } catch {
    const normalized = Number(value || 0).toFixed(2).replace('.', ',');
    return `R$ ${normalized}`;
  }
}

// =============== Arquivos (render-only) ===============
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
      <img src="${iconPath}" alt="">
      <span class="tituloArquivo">${fileItem?.nomeArquivo || 'arquivo'}</span>
    `;
    fileRowElement.addEventListener('click', () => {
      if (fileItem?.urlArquivo) openFileExtern(fileItem.urlArquivo);
    });
    documentFilesContainer.appendChild(fileRowElement);
  });
}

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
  renderFilesReadOnly(arquivos);

  // Resultado (fixo por enquanto, pronto para cálculo real depois)
  const fixedResultValue = 35;
  resultValueElement.textContent = `Resultado: ${formatCurrencyToBRL(fixedResultValue)}`;
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

// =============== Interações: Menu de opções (kebab) ===============
optionsKebabButton.addEventListener('click', (event) => {
  event.stopPropagation();
  const isHidden = optionsKebabMenu.getAttribute('aria-hidden') !== 'false';
  optionsKebabMenu.setAttribute('aria-hidden', String(!isHidden));
});

document.addEventListener('click', (event) => {
  if (!optionsKebabMenu.contains(event.target) && !optionsKebabButton.contains(event.target)) {
    optionsKebabMenu.setAttribute('aria-hidden', 'true');
  }
});

editDocumentButton.addEventListener('click', () => {
  const documentId = getDocumentIdFromUrl();
  // Mantém a tela de adicionar como "modo edição"
  window.location.href = `adicionarDocumentos.html?mode=edit&id=${encodeURIComponent(documentId)}`;
});

deleteDocumentButton.addEventListener('click', async () => {
  const documentId = getDocumentIdFromUrl();
  const userConfirmed = confirm('Tem certeza que deseja excluir este documento? Esta ação não pode ser desfeita.');
  if (!userConfirmed) return;

  try {
    await window.api.documentos.delete(documentId);
    window.location.href = 'documentos.html';
  } catch (error) {
    console.error('Falha ao excluir o documento:', error);
    alert('Não foi possível excluir o documento.');
  }
});

// =============== Inicialização ===============
loadDocumentAndRender();
