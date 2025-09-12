// scripts/certidoes.js
// CHANGED: usar o módulo compartilhado
import { KEY, getArray, removeArray } from './common/localStorage.js';
import { iconFor, openFileExtern, setupSharedModal, pickPaths } from './common/filesSection.js';

const listaArquivos = document.getElementById('lista-arquivos');
const uploadButton  = document.getElementById('uploadButton');

// CHANGED: render específico desta tela (cards grandes)
function renderList(){
  const itens = getArray(KEY.certidoes) || [];
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
    const card = document.createElement('div');
    card.className = 'certidao-preview';
    card.innerHTML = `
      <img src="${iconFor(item)}" alt="arquivo">
      <span class="tituloArquivo">${item.nomeArquivo}</span>
      <div class="delete-icon"><img src="assets/delete.png" alt="Remover"></div>
    `;

    card.addEventListener('click', ()=> { if(item.urlArquivo) openFileExtern(item.urlArquivo); });
    card.querySelector('.delete-icon')?.addEventListener('click', (ev)=>{
      ev.stopPropagation();
      removeArray(KEY.certidoes, x => x.nomeArquivo===item.nomeArquivo && (x.urlArquivo||'')===(item.urlArquivo||''));
      renderList();
    });

    listaArquivos.appendChild(card);
  });
}

// CHANGED: modal compartilhado (IDs já existem no certidoes.html)
const modalCtl = setupSharedModal({
  storageKey: KEY.certidoes,
  modalIds: {
    modalId:      'file-preview-modal',
    titleId:      'file-title-input',
    saveBtnId:    'file-save-button',
    cancelBtnId:  'file-cancel-button',
    iconSelector: '#file-preview-modal .certidao-preview > img'
  },
  defaultTipo: 'certidoes',
  onAfterSave: ()=> renderList(),
});

uploadButton?.addEventListener('click', async (e)=>{
  e.preventDefault(); e.stopPropagation();
  const paths = await pickPaths({ multi: true });
  if(!paths?.length) return;
  modalCtl.enqueuePaths(paths);
});

renderList();
