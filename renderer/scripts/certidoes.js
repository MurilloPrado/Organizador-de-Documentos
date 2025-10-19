// scripts/certidoes.js
// CHANGED: usar o módulo compartilhado
import { KEY, getArray, removeArray } from './common/localStorage.js';
import { iconFor, openFileExtern, setupSharedModal, pickPaths } from './common/filesSection.js';

const params = new URLSearchParams(window.location.search);
const ctx = (params.get('ctx') || 'create').toLowerCase();
const isViewMode = ctx === 'view';
const docId = Number(params.get('id') || 0);
let isDeleting = false;


console.log(` docId = ${docId}, isViewMode = ${isViewMode} `);

const headerEl = document.querySelector('header');
const listaArquivos = document.getElementById('lista-arquivos');
const uploadButton  = document.getElementById('uploadButton');
const topLink = document.querySelector('header a');

function updateTopLink() {
  if (!topLink) return;

  if (isViewMode) {
    const backHref = docId ? `verDocumento.html?id=${docId}` : 'verDocumento.html';
    topLink.href = backHref;
    topLink.innerHTML = '&#x25C0;'; 
    topLink.classList.remove('cancel-button');
    topLink.classList.add('back-button');
  } else {
    topLink.href = 'adicionarDocumentos.html';
    topLink.innerHTML = `<img src="assets/x.png" alt="cancelar" class="cancel-button">`;
    topLink.classList.add('cancel-button');
    topLink.classList.remove('back-button');
  }
}
updateTopLink();

// menu
if(headerEl && isViewMode){
  const kebabButton = document.createElement('button');
  kebabButton.type = 'button';
  kebabButton.id = 'kebabButton';
  kebabButton.className = 'kebab-button';
  kebabButton.textContent = '⋮';
  headerEl.appendChild(kebabButton);

  const kebabMenu = document.createElement('div');
  kebabMenu.id = 'kebabMenu';
  kebabMenu.className = 'kebab-menu hidden';
  kebabMenu.innerHTML = `
      <button id="enterDeleteButton" class="kebab-menu-item danger" type="button">
          Excluir Itens
      </button>
  `;
  headerEl.appendChild(kebabMenu);

  // abre menu
  kebabButton.addEventListener('click', () => {
      kebabMenu.classList.toggle('hidden');
  });

  // fecha ao clicar fora
  document.addEventListener('click', (event) => {
      if (!kebabMenu.contains(event.target) && event.target !== kebabButton) {
          kebabMenu.classList.add('hidden');
      }
  });

  const enterDeleteButton = kebabMenu.querySelector('#enterDeleteButton');
  enterDeleteButton.addEventListener('click', () => {
      kebabMenu.classList.add('hidden');
      isDeleting = true;
      renderList();
  });
}

// buscar no banco de dados, se for view
async function fetchFromDB() {
  if (!isViewMode || !docId || !window.api?.documentos?.getById) return [];
  const bundle = await window.api.documentos.getById(docId);
  const all = bundle?.arquivos || [];
  // apenas certidões
  return all.filter(a => String(a?.tipoArquivo).toLowerCase() === 'certidoes');
}

// busca no localStorage
function fetchFromLocal(){
  const arr = getArray(KEY.certidoes) || [];
  return arr.filter(a => String(a?.tipoArquivo || 'certidoes').toLowerCase() === 'certidoes');
}

// busca no localStorage
async function getItens(){
  return isViewMode ? await fetchFromDB() : fetchFromLocal();
}

async function deleteFromDb(item){
  if(!isViewMode) return;
  if(!docId){
    console.error('Documento inválido para excluir certidão.');
    return;
  }

  try {
    if(window.api?.documentos?.removeArquivo && item?.idArquivo){
      await window.api.documentos.removeArquivo({ idArquivo: Number(item.idArquivo), removePhysical: true });
    } else {
      console.error('API inválida para excluir certidão do documento.');
    }

    console.log('Certidão excluída do documento:', item);
    await renderList();
  } catch(err){
    console.error('Erro ao excluir certidão do documento:', err);
  }
};

// renderiza os cards
function makeCard(item, {allowDelete}) {
  const card = document.createElement('div');
  card.className = 'certidao-preview';
  const titulo = item.nomeArquivo || item.tituloArquivo || item.nomeOriginal || 'arquivo';
  card.innerHTML = `
    <img src="${iconFor(item)}" alt="arquivo">
    <span class="tituloArquivo">${titulo}</span>
    ${allowDelete && isDeleting ? `<div class="delete-icon" data-url="${item.urlArquivo}"><img src="assets/delete.png" alt="Remover"></div>` : ''}
  `;

  card.addEventListener('click', async (e) => {
    // se clicar no ícone de exclusão
    if (e.target.closest('.delete-icon')) {
      e.stopPropagation();
      console.log('Removendo certidão:', item);

      if(isViewMode){
        await deleteFromDb(item);
      } else {
        // remove do array local
        removeArray(KEY.certidoes, (x) => 
          (x.urlArquivo || '') === (item.urlArquivo || '')
        );
      };

      // atualiza lista
      renderList();
      return;
    };
    if(!isDeleting && item.urlArquivo){
      openFileExtern(item.urlArquivo);
    }
  });

  return card;
}

// CHANGED: render específico desta tela (cards grandes)
async function renderList(){
  const itens = await getItens();
  if(!listaArquivos) return;

  if(!itens.length){
    listaArquivos.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;text-align:center;color:#6b7280;padding:24px;font-weight:600;">
        Não existem arquivos adicionados.
      </div>`;
    return;
  }

  listaArquivos.innerHTML = '';
  itens.forEach((item)=>{
    const card = makeCard(item, { allowDelete: isViewMode ? isDeleting : true });
    listaArquivos.appendChild(card);
  });
}

// modal compartilhado
const modalCtl = setupSharedModal({
  storageKey: KEY.certidoes,
  modalIds: {
    modalId: 'file-preview-modal',
    titleId: 'file-title-input',
    saveBtnId: 'file-save-button',
    cancelBtnId: 'file-cancel-button',
    iconSelector: '#file-preview-modal .certidao-preview > img'
  },
  defaultTipo: 'certidoes',

  onAfterSave: ()=> {
    // ao salvar sai do modo exclusao
    if(isDeleting) isDeleting = false;
    renderList();
  },

  // no view grava no db
  persist: isViewMode ? async (item) => {
    if(!docId) throw new Error('Documento inválido para salvar certidão.');
    const payload = {
      idDocumento: Number(docId),
      urlArquivo: String(item?.urlArquivo||'').trim(),
      tipoArquivo: 'certidoes',
      tituloArquivo: String(item?.nomeArquivo || item?.nomeOriginal || '').trim(),
    }
    console.log('[certidoes] salvando certidão no documento:', payload);

    if(!payload.idDocumento || !payload.urlArquivo){
      console.error('Dados insuficientes para salvar certidão:', { docId, item });
      throw new Error('Dados insuficientes para salvar certidão.');
    }

    await window.api.documentos.addArquivo(payload);
  } : undefined
});

uploadButton?.addEventListener('click', async (e)=>{
  e.preventDefault(); e.stopPropagation();
  const paths = await pickPaths({ multi: true });
  if(!paths?.length) return;
  modalCtl.enqueuePaths(paths);
});

renderList();
