import{ KEY, pushArray, removeArray, getArray } from './common/localStorage.js';
import { guessMimeFromName } from './common/mime.js';

const modal = document.getElementById('file-preview-modal');
const modalTitle = document.getElementById('file-title-input');
const saveButton = document.getElementById('file-save-button');
const cancelButton = document.getElementById('file-cancel-button');
const modalIcon = document.querySelector('#file-preview-modal .certidao-preview > img');
let pendingQueue = [];
let currentItem = null;

const fileInput = document.getElementById('fileInput');
const listaArquivos = document.getElementById('lista-arquivos');


function openFileExtern(absPath){
  if(!absPath) return;
  window.files?.openPath?.(absPath);
}

function getExtension(name = '') {
    const base = name.toLowerCase().split('/').pop().split('\\').pop();
    const index = base.lastIndexOf('.');
    return index >= 0 ? base.substring(index + 1) : '';
}

// Separa os tipos de arquivos
const imageExtensions = new Set(['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'tiff', 'svg']);
function isImageFile(name, mime = '') {
    const ext = getExtension(name);
    return mime.startsWith('image/') || imageExtensions.has(ext);
}

function isPdfFile(name, mime = '') {
    const ext = getExtension(name);
    return mime === 'application/pdf' || ext === 'pdf';
}

function isWordFile(name, mime = '') {
    const ext = getExtension(name);
    return mime === 'application/msword' || mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || ext === 'doc' || ext === 'docx';
}

function iconForItem({nomeOriginal = '', mimeArquivo = ''}) {
    const mime = (mimeArquivo || guessMimeFromName(nomeOriginal) || '').toLowerCase();

    if(isImageFile(nomeOriginal, mime)) return 'assets/img.png';
    if(isPdfFile(nomeOriginal, mime)) return 'assets/pdf.png';
    if(isWordFile(nomeOriginal, mime)) return 'assets/word.png';
    return 'assets/documento.png';
}

function suggestTitleFromName(name = '') {
    const base = name.split('/').pop().split('\\').pop();
    return base.replace(/\.[^.]+$/, '');
}

// Renderiza a lista de arquivos
function renderList() {
    const itens = getArray(KEY.certidoes);
    if(!listaArquivos) return;

    // Estado vazio
    if (itens.length === 0) {
        listaArquivos.innerHTML = `
        <div class="empty-state" style="
            grid-column: 1 / -1; 
            text-align:center; 
            color:#6b7280; 
            padding:24px;
            font-weight:600;">
            Não existem arquivos adicionados.
        </div>`;
        return;
    }

    listaArquivos.innerHTML = '';
    itens.forEach((item) => {
        const card = document.createElement('div');
        card.className = 'certidao-preview';

        const iconSrc = iconForItem(item);

        card.innerHTML = `
        <img src="${iconSrc}" alt="arquivo">
        <span class="tituloArquivo">${item.nomeArquivo}</span>
        <div class="delete-icon">
            <img src="assets/delete.png" alt="Remover">
        </div>
        `;

        // abre o arquivo no navegador
        card.addEventListener('click', () => {
            if(!item?.urlArquivo) return;
            openFileExtern(item.urlArquivo);
        });

        // remover item
        const excluir = card.querySelector('.delete-icon');
        excluir?.addEventListener('click', (evt) => {
            evt.stopPropagation(); //não abre arquivo
            removeArray(KEY.certidoes, (x) => 
                x.nomeArquivo === item.nomeArquivo && (x.urlArquivo || '') === (item.urlArquivo || '')
        );
        renderList();

        });

        listaArquivos.appendChild(card);
    });
}

async function showModal(item) {
    currentItem = item;

    //console.log('[Modal] item.urlArquivo:', item.urlArquivo, 'item.nomeOriginal:', item.nomeOriginal);

    if (modalIcon) {
      modalIcon.src = iconForItem(item);
    }
    if (modalTitle) {
      modalTitle.value = suggestTitleFromName(item.nomeOriginal || item.nomeArquivo || '');
    }
    if (modal) {
      modal.style.display = 'flex';
    }
}

function hideModal() {
    if(modal){
        modal.style.display = 'none';
    }
    currentItem = null;
}

function processNextInQueue(){
    if(pendingQueue.length === 0){
        hideModal();
        return;
    }
    const next = pendingQueue.shift();
    showModal(next);
}

saveButton?.addEventListener('click', saveFromModal);
cancelButton?.addEventListener('click', cancelModal);

// salva arquivo do modal para mostrar na lista
function saveFromModal() {
    if(!currentItem) return;

    const tituloArquivo = (modalTitle?.value || '').trim() || suggestTitleFromName(currentItem.nomeOriginal || '');
    const toSave = {
        urlArquivo: currentItem.urlArquivo,
        tipoArquivo: 'certidoes',
        nomeArquivo: tituloArquivo,
        nomeOriginal: currentItem.nomeOriginal || '',
        mimeArquivo: guessMimeFromName(currentItem.nomeOriginal || ''),
    };

    //console.log('Salvando arquivo:', toSave);

    pushArray(KEY.certidoes, toSave);
    renderList();
    processNextInQueue();
}

function cancelModal(){
    processNextInQueue();
}

uploadButton?.addEventListener('click', async (e) => {
  e.preventDefault();
  e.stopPropagation();

  try {
    if (window.files?.choose) {
      const paths = await window.files.choose({ multi: true });
      if (!paths || !paths.length) return;   // <- CORRETO

      for (const p of paths) {
        const nome = p.split('/').pop().split('\\').pop();
        //console.log('[IPC choose] path selecionado:', p);
        pendingQueue.push({
          urlArquivo: p,         // <- CAMINHO ABSOLUTO DO MAIN (com path real)
          nomeOriginal: nome,
        });
      }
      if (!currentItem) processNextInQueue();
    } else {
      // fallback só se o IPC não existir
      fileInput?.click();
    }
  } catch (error) {
    console.error('Erro ao selecionar arquivos:', error);
  }
});

renderList();
