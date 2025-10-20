// scripts/adicionarDocumentos.js
import { KEY, clear, getArray, removeArray } from './common/localStorage.js';
import { iconFor, openFileExtern, setupSharedModal, pickPaths } from './common/filesSection.js';

const STORAGE_KEY = KEY.arquivos; // troque quando separar os storages

const listEl      = document.querySelector('.file-preview'); // container inline
const uploadBtn   = document.getElementById('uploadButton');
const saveDocumentBtn = document.getElementById('salvarDocumento');
const detalhesEl = document.getElementById('detalhes');

const tituloDocumento = document.getElementById("titulo-documento");
const tituloInput = document.getElementById("titulo-input");
const editar = document.getElementById("editar");
const clienteInput = document.getElementById("clienteInput");
const detalhesInput = document.getElementById("detalhes");
const fileInput = document.getElementById("fileInput");
const previewArquivo = document.querySelector(".preview-arquivo");
const dataCriacaoEl = document.getElementById("data-criado");

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

// titulo padrão 
let tituloPadrao = 'Documento 0001';
(async () => {
  try {
    const ultimoId = await window.api?.documentos?.getUltimoId?.(); // retorna número ou 0
    const proximo  = String((ultimoId || 0) + 1).padStart(4, '0');
    tituloPadrao   = `Documento ${proximo}`;
  } finally {
    // inicializa valor exibido e input com draft OU padrão
    const inicial = loadDraft(DRAFT.titulo) || tituloPadrao;
    tituloDocumento.textContent = inicial;
    tituloInput.value = inicial;
  }
})();

// salvar título
function salvarTitulo() {
  const novo = (tituloInput.value || '').trim();
  const val  = novo || tituloPadrao;

  tituloDocumento.textContent = val;
  tituloInput.value = val;
  saveDraft(DRAFT.titulo, val);

  // alterna visibilidade
  tituloInput.style.display = 'none';
  editar.style.display = 'block';
  tituloDocumento.style.display = 'block';
}

// entrar no modo edição
editar.addEventListener('click', () => {
  // mostra input com o valor atual
  const atual = (tituloDocumento.textContent || '').trim();
  tituloInput.value = (atual === tituloPadrao) ? '' : atual;

  tituloDocumento.style.display = 'none';
  editar.style.display = 'none';
  tituloInput.style.display = 'block';
  tituloInput.focus();
  // seleciona o conteúdo pra editar rápido
  tituloInput.select?.();
});

// sair do modo edição
tituloInput.addEventListener('blur', salvarTitulo);
tituloInput.addEventListener('keydown', (ev) => {
  if (ev.key === 'Enter') salvarTitulo();
  if (ev.key === 'Escape') {
    // cancelar: volta ao valor exibido (sem salvar)
    tituloInput.value = tituloDocumento.textContent || tituloPadrao;
    tituloInput.blur();
  }
});

if(dataCriacaoEl){
  const hoje = new Date();
  const dia = String(hoje.getDate()).padStart(2, '0');
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  const ano = hoje.getFullYear();
  dataCriacaoEl.textContent = `${dia}/${mes}/${ano}`;
}

const DRAFT = {
  titulo: 'draft.tituloDocumento',
  cliente: 'draft.nomeCliente',
  detalhes: 'draft.detalhesDocumento',
};

const saveDraft = (k,v) => localStorage.setItem(k, v ?? '');
const loadDraft = (k)  => localStorage.getItem(k);

// Inicialização
(async function initDraft(){
  // pega o último id do banco
  const ultimoId = await window.api.documentos.getUltimoId();
  const proximoId = String((ultimoId || 0) + 1).padStart(4, '0');
  const tituloPadrao = `Documento ${proximoId}`;

  // restaura drafts ou usa defaults
  const draftTitulo   = loadDraft(DRAFT.titulo)   || tituloPadrao;
  const draftCliente  = loadDraft(DRAFT.cliente)  || '';
  const draftDetalhes = loadDraft(DRAFT.detalhes) || '';

  if (tituloInput)   tituloInput.value = draftTitulo;
  if (clienteInput)  clienteInput.value = draftCliente;
  if (detalhesInput) detalhesInput.value = draftDetalhes;
})();

// salvar rascunho sempre que o usuário alterar
tituloInput?.addEventListener('input', ()=>{
  saveDraft(DRAFT.titulo, tituloInput.value);
  if (tituloDocumento) tituloDocumento.textContent = tituloInput.value;
});
clienteInput?.addEventListener('input', ()=> saveDraft(DRAFT.cliente, clienteInput.value));
detalhesInput?.addEventListener('input', ()=> saveDraft(DRAFT.detalhes, detalhesInput.value));

// limpar tudo (usar após salvar documento)
function clearAllStates(){
  [DRAFT.titulo, DRAFT.cliente, DRAFT.detalhes].forEach(k=> localStorage.removeItem(k));
  [KEY.arquivos, KEY.certidoes, KEY.servicos, KEY.taxas].forEach(k=> localStorage.removeItem(k));
}

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

// Sugestão de clientes
let suggestBox = document.getElementById('clienteSuggest');
if(!suggestBox) {
  suggestBox = document.createElement('div');
  suggestBox.id = 'clienteSuggest';
  Object.assign(suggestBox.style, {
    position: 'absolute', zIndex: '9999', background: '#fff',
    border: '1px solid #e5e7eb', borderRadius: '8px',
    boxShadow: '0 8px 24px rgba(0,0,0,.08)', padding: '6px 0',
    display: 'none', maxHeight: '220px', overflowY: 'auto',
    width: clienteInput?.offsetWidth ? `${clienteInput.offsetWidth}px` : '100%',
  });

  const wrap = document.createElement('div');
  wrap.style.position = 'relative';
  clienteInput?.parentNode?.insertBefore(wrap, clienteInput);
  wrap.appendChild(clienteInput);
  wrap.appendChild(suggestBox);
}

function renderClientSuggestions(names) {
  if (!names?.length) {
    suggestBox.style.display = 'none';
    suggestBox.innerHTML = '';
    return;
  }

  // limpa sugestões antigas
  suggestBox.innerHTML = '';

  console.log('sugestões:', names);

  names.forEach((n) => {
    const el = document.createElement('div');
    el.className = 'client-suggest';

    const icon = document.createElement('span');
    icon.className = 'client-suggest-icon';
    icon.innerHTML = '<img src="./assets/pessoa.png">';

    const label = document.createElement('span');
    label.className = 'client-suggest-label';
    label.textContent   = n; // mantém o nome como está no banco


    el.append(icon, label);

    el.addEventListener('mousedown', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      clienteInput.value = n;
      saveDraft(DRAFT.cliente, clienteInput.value);
      suggestBox.style.display = 'none';
    });
    suggestBox.appendChild(el);
  });

  suggestBox.style.display = 'block';
}

let suggestTimer = null;
clienteInput?.addEventListener('input', ()=>{
  const q = (clienteInput.value || '').trim();
  clearTimeout(suggestTimer);
  suggestTimer = setTimeout( async()=>{
    if(q.length < 2) {
      renderClientSuggestions([]);
      return;
    }

    try {
      const names = await window.api.clientes.searchPrefix(q) || [];
      renderClientSuggestions([...new Set(names)].slice(0,6));
    } catch(err) {
      console.error('autocomplete cliente falhou:', err);
      renderClientSuggestions([]);
    }
  }, 220);
});
clienteInput?.addEventListener('blur', ()=>setTimeout(()=> renderClientSuggestions([]), 200));
  


renderInline();

// Botão salvar documento, envia os dados para o payload
async function salvarDocumento() {
  try {
    const nomeDocumento = String(tituloDocumento.textContent || '').trim();
    const nomeCliente = String(clienteInput.value || '').trim();
    const detalhesDocumento = String(detalhesEl.value || '').trim() || null;

    if(!nomeCliente) {
      alert('Por favor, informe o nome do cliente antes de salvar o documento.');
      return;
    }

    // Junta serviços e taxas
    const servicos = getArray(KEY.servicos) || [];
    const taxas = getArray(KEY.taxas) || [];
    const lancamentos = [...servicos, ...taxas].map(item => ({
      tipoLancamento: String(item.tipo || '').toLowerCase(),
      detalhes: item?.detalhes || null,
      valor: Number(item?.valor) || 0,
      tituloLancamento: item?.nome || null,
    }));

    // Junta todos os arquivos
    const arquivosInline = getArray(KEY.arquivos) || [];
    const certidoes = getArray(KEY.certidoes) || [];
    const arquivos = [...arquivosInline, ...certidoes];

    // Cria o payload
    const payload = {
      nomeDocumento,
      nomeCliente,
      detalhes: detalhesDocumento,
      lancamentos,
      arquivos,
      createdAt: new Date().toISOString(),
    };
    const res = await window.api.documentos.create(payload);

    // Ao finalizar, redireciona para documentos.html
    clearAllStates();
    window.location.href = 'documentos.html';
  } catch (err) {
    console.error('Falha ao salvar documento:', err);
    alert('Não foi possível salvar o documento: ' + (err?.message || err));
  }
}

saveDocumentBtn?.addEventListener('click', (e)=>{
  e.preventDefault(); e.stopPropagation();
  salvarDocumento();
});