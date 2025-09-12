// scripts/adicionarDocumentos.js
import { KEY, getArray, removeArray } from './common/localStorage.js';
import { iconFor, openFileExtern, setupSharedModal, pickPaths } from './common/filesSection.js';

const STORAGE_KEY = KEY.arquivos; // troque quando separar os storages

const listEl      = document.querySelector('.file-preview'); // container inline
const uploadBtn   = document.getElementById('uploadButton');

const tituloDocumento = document.getElementById("titulo-documento");
const tituloInput = document.getElementById("titulo-input");
const editar = document.getElementById("editar");
const clienteInput = document.getElementById("clienteInput");
const fileInput = document.getElementById("fileInput");
const previewArquivo = document.querySelector(".preview-arquivo");

// LocalStorage keys
const LS_SERVICOS = 'lancamentos_servicos';
const LS_TAXAS = 'lancamentos_taxas';
const LS_CERTIDOES = 'arquivos_certidoes';
const LS_ARQUIVOS = 'arquivos';

// Função para obter dados do LocalStorage com fallback
function getJSON(key, fallback = []) {
    try {
        return JSON.parse(localStorage.getItem(key) || '[]');
    } catch {
        return fallback;
    }
}

// Função para salvar dados no LocalStorage
function setJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value || []));
}

// Texto padrão
const tituloPadrao = "Documento";

const salvarTitulo = () => {
        // Pega o texto do input
    const novoTexto = tituloInput.value.trim();

    // Se o input estiver vazio, volta ao texto padrão, se não, usa o texto do input
    if (novoTexto === "") {
        tituloDocumento.textContent = tituloPadrao;
    } else {
        tituloDocumento.textContent = novoTexto;
    }

    // Esconde o input e mostra o título
    tituloInput.style.display = "none";
    editar.style.display = "block";
    tituloDocumento.style.display = "block";
};

editar.addEventListener("click", () => {
    const textoAtual = tituloDocumento.textContent;

    // Esconde o título e mostra o input
    tituloDocumento.style.display = "none";
    editar.style.display = "none";
    tituloInput.style.display = "block";

    // Verifica se o texto atual é o padrão, se não, mantém o texto
    if (textoAtual === tituloPadrao) {
        tituloInput.value = "";
    } else {
        tituloInput.value = textoAtual;
    }

    // Foca o input para edição imediata
    tituloInput.focus();
});

// Quando o input perder o foco, atualiza o título e esconde o input
tituloInput.addEventListener("blur", () => {
    salvarTitulo();
});

// Quando o usuário pressionar Enter, atualiza o título e esconde o input
tituloInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        salvarTitulo();
    }
});

// Render inline (apenas para adicionarDocumentos)
function renderInline(){
  const items = getArray(STORAGE_KEY) || [];
  listEl.innerHTML = '';
  if(!items.length){
    listEl.innerHTML = `<div class="empty-state" style="grid-column:1/-1;text-align:center;color:#6b7280;padding:24px;font-weight:600;">Não existem arquivos adicionados.</div>`;
    return;
  }

  items.forEach(item=>{
    const row = document.createElement('div');
    row.className = 'files';
    row.innerHTML = `
      <div class="delete-file-icon"><img src="assets/delete.png" alt="Remover"></div>
      <img src="${iconFor(item)}" alt="arquivo">
      <span class="tituloArquivo">${item.nomeArquivo}</span>
    `;

    row.addEventListener('click', ()=> openFileExtern(item.urlArquivo));
    row.querySelector('.delete-file-icon')?.addEventListener('click', (ev)=>{
      ev.stopPropagation();
      removeArray(STORAGE_KEY, x => x.nomeArquivo===item.nomeArquivo && (x.urlArquivo||'')===(item.urlArquivo||''));
      renderInline();
    });

    listEl.appendChild(row);
  });
}

// Modal compartilhado (reaproveita o MESMO modal/IDs dessa página)
const modalCtl = setupSharedModal({
  storageKey: STORAGE_KEY,
  modalIds: {
    modalId:      'file-preview-modal',
    titleId:      'file-title-input',
    saveBtnId:    'file-save-button',
    cancelBtnId:  'file-cancel-button',
    iconSelector: '#file-preview-modal .certidao-preview > img'
  },
  defaultTipo: 'arquivo',
  onAfterSave: ()=> renderInline(),
});

// Botão: usa o mesmo picker via IPC e envia para o modal
uploadBtn?.addEventListener('click', async (e)=>{
  e.preventDefault(); e.stopPropagation();
  const paths = await pickPaths({ multi: true });
  if(!paths?.length) return;
  modalCtl.enqueuePaths(paths);
});

renderInline();
