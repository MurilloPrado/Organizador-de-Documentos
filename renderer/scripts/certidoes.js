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

async function convertFileUrl(url) {
    if(!url) return;
    const fileUrl = await window.electron?.convertPathToUrl?.(url);

    if(fileUrl){
        window.electron?.openExternal?.(fileUrl);
    }
}

function openFileInBrowser(url){
    if(!url) {
        console.log("Url vazia");
        return;
    }

    console.log("caminho do arquivo:", url);
    window.electron?.openExternal?.(url);
}

function getExtension(name = '') {
    const base = name.toLowerCase().split('/').pop().split('\\').pop();
    const index = base.lastIndexOf('.');
    return index >= 0 ? base.substring(index + 1) : '';
}

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
            openFileInBrowser(item.urlArquivo);
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

    pushArray(KEY.certidoes, toSave);
    renderList();
    processNextInQueue();
}

function cancelModal(){
    processNextInQueue();
}

if(fileInput) {
    fileInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files || []);
        if(files.length === 0) return;

        files.forEach((f) => {
            pendingQueue.push({
                urlArquivo: f.path || null,
                nomeOriginal: f.name
            });
        });

        fileInput.value = '';
        if(!currentItem) processNextInQueue();
    });
}

renderList();

