// scripts/common/files-shared.js
import { pushArray, getArray, removeArray, KEY } from './localStorage.js';
import { guessMimeFromName } from './mime.js';

// ---------- utilidades ----------
export function openFileExtern(absPath){
  if(!absPath) return;
  window.files?.openPath?.(absPath); // abre no app padrão via shell.openPath (main)
}

function getExt(name=''){
  const b = name.toLowerCase().split('/').pop().split('\\').pop();
  const i = b.lastIndexOf('.');
  return i >= 0 ? b.substring(i+1) : '';
}

const imgExt = new Set(['png','jpg','jpeg','gif','bmp','webp','tiff','svg']);
function isImg(name, mime=''){ const e=getExt(name); return mime.startsWith('image/') || imgExt.has(e); }
function isPdf(name, mime=''){ const e=getExt(name); return mime==='application/pdf' || e==='pdf'; }
function isDoc(name, mime=''){ const e=getExt(name); return mime==='application/msword' || mime==='application/vnd.openxmlformats-officedocument.wordprocessingml.document' || e==='doc' || e==='docx'; }

export function iconFor(item){
  const nome = item?.nomeOriginal || item?.nomeArquivo || item?.urlArquivo || '';
  const mime = (item?.mimeArquivo || guessMimeFromName(nome) || '').toLowerCase();
  if (isImg(nome, mime)) return 'assets/img.png';
  if (isPdf(nome, mime)) return 'assets/pdf.png';
  if (isDoc(nome, mime)) return 'assets/word.png';
  return 'assets/documento.png';
}

export function titleFrom(name=''){
  const b = name.split('/').pop().split('\\').pop();
  return b.replace(/\.[^.]+$/, '');
}

// Abre o dialog do SO (via IPC do main)
export async function pickPaths({ multi = true, filters } = {}){
  if(!window.files?.choose) return [];
  return await window.files.choose({ multi, filters });
}

// ---------- controlador de modal compartilhado ----------
export function setupSharedModal({
  storageKey,                       // ex.: KEY.certidoes ou KEY.arquivosDocumento
  modalIds: { modalId, titleId, saveBtnId, cancelBtnId, iconSelector },
  defaultTipo = 'arquivo',
  onAfterSave,                      // callback opcional (ex.: re-render)
}){
  const modal        = document.getElementById(modalId);
  const modalTitle   = document.getElementById(titleId);
  const saveButton   = document.getElementById(saveBtnId);
  const cancelButton = document.getElementById(cancelBtnId);
  const modalIcon    = document.querySelector(iconSelector);

  let pendingQueue = [];
  let currentItem  = null;

  function showModal(item){
    currentItem = item;
    if (modalIcon)  modalIcon.src = iconFor(item);
    if (modalTitle) modalTitle.value = titleFrom(item.nomeOriginal || item.nomeArquivo || '');
    if (modal)      modal.style.display = 'flex';
  }

  function hideModal(){ if(modal) modal.style.display = 'none'; currentItem = null; }

  function processNext(){
    if(!pendingQueue.length){ hideModal(); return; }
    showModal(pendingQueue.shift());
  }

  function saveFromModal(){
    if(!currentItem) return;
    const titulo = (modalTitle?.value || '').trim() || titleFrom(currentItem.nomeOriginal || '');
    const toSave = {
      urlArquivo:   currentItem.urlArquivo,          // ABSOLUTO (vem do pickPaths/IPC)
      tipoArquivo:  currentItem.tipoArquivo || defaultTipo,
      nomeArquivo:  titulo,
      nomeOriginal: currentItem.nomeOriginal || '',
      mimeArquivo:  guessMimeFromName(currentItem.nomeOriginal || ''),
    };
    pushArray(storageKey, toSave);
    onAfterSave?.(toSave);
    processNext();
  }

  saveButton?.addEventListener('click', saveFromModal);
  cancelButton?.addEventListener('click', processNext);

  return {
    /** Enfileira caminhos absolutos vindos do pickPaths */
    enqueuePaths(paths){
      for(const p of paths){
        const nome = p.split('/').pop().split('\\').pop();
        pendingQueue.push({ urlArquivo: p, nomeOriginal: nome });
      }
      if(!currentItem) processNext();
    }
  };
}

// re-export útil
export { getArray, removeArray, KEY };
