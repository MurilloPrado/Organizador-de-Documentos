import{ KEY, pushArray, setArray, removeArray, getArray } from './common/localStorage.js';
import { toNumber, toBRL } from './common/money.js';

// identificar modo da página (create/view)
const params = new URLSearchParams(window.location.search);
const ctx = (params.get('ctx') || 'create').toLowerCase();
const isViewMode = ctx === 'view';
const docId = Number(params.get('id') || 0);
let isDeleting = false;

/* verificação */
console.groupCollapsed('SERVIÇOS :: contexto');
console.log('search =>', window.location.search);
console.log('ctx =>', ctx);
console.log('docId =>', docId);
console.log('isViewMode =>', isViewMode);
console.groupEnd();


let tipoLancamento = (params.get('tipo') || '').toLowerCase();
if (!tipoLancamento) {
  if (window.location.pathname.includes('taxa')) tipoLancamento = 'taxa';
  else tipoLancamento = 'servico'; // padrão
}

const tipoElement = document.getElementById('tipo');
const formContainer = document.getElementById('formContainer');
const listContainer = document.getElementById('listContainer');
const inputNome = document.getElementById('nome');
const inputDetalhes = document.getElementById('detalhes');
const inputValor = document.getElementById('valor');
const addButton = document.getElementById('add-button');
const newItemButton = document.getElementById('new-item-button');
const saveButton = document.getElementById('save-button');
const listaElement = document.getElementById('lista');
const subtotal = document.getElementById('subtotal');
const topLink = document.querySelector('header a');

const MAP = {
    servico: KEY.servicos,
    taxa: KEY.taxas,
}

const currentKey = () => {
    const t = String(tipoElement?.value||'').toLowerCase();
    return MAP[t];
}

// Formata o campo de valor enquanto o usuário digita
inputValor.addEventListener('input', () => {
    const digitos = inputValor.value.replace(/\D/g, '');
    const numero = Number(digitos) / 100;
    inputValor.value = toBRL(numero);
});

// troca icone
if (topLink && isViewMode) {
    topLink.href = docId ? `verDocumento.html?id=${docId}` : 'verDocumento.html';
    topLink.innerHTML = '&#x25C0;'; // ◀
    topLink.classList.remove('cancel-button');
    topLink.classList.add('back-button');
} 

function getAll() {
    return getArray(currentKey()) || [];
}

function setAll(a){
    return setArray(currentKey(), a);
}

export function add({ nome, detalhes, valor }) {
    console.log({ nome, detalhes, valor });
    return pushArray(currentKey(), {
        tipo: String(tipoElement.value),
        nome: String(nome||'').trim() || 'Sem nome',
        detalhes: String(detalhes||'').trim() || null,
        valor: toNumber(valor),
    });
}

export function list() {
    return getAll();
}

export function remove(index){
    return removeArray(currentKey(), index);
}

function setMode(mode){
    const showForm = isViewMode && mode === 'form';
    if(formContainer) formContainer.style.display = showForm ? 'block' : 'none';
    if(listContainer) listContainer.style.display = showForm ? 'none' : 'block';
}

function hasItens(){
    return getAll().length > 0;
}

function renderList() {
    if(!listContainer) return;
    const itens = getAll();
    listaElement.innerHTML = '';

    if(!itens || itens.length === 0) {
        listaElement.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1;text-align:center;color:#6b7280;padding:24px;font-weight:600;">
        Não existem ${tipoLancamento === 'taxa' ? 'taxas adicionadas' : 'serviços adicionados'}.  
        </div>`;
        if (subtotal) subtotal.textContent = 'Subtotal: R$ 0,00';
        return;
    }

    itens.forEach((item, i) => {
        const card = document.createElement('div');
        card.className = 'servicos';
        card.style.marginBottom = '50px';

        const h3 = document.createElement('h3');
        h3.textContent = item.nome || 'Sem nome';

        const p = document.createElement('p');
        p.textContent = item.detalhes || '';

        const rodape = document.createElement('div');
        rodape.className = 'servicos-rodape';

        if (!isViewMode || isDeleting){
            const remover = document.createElement('img');
            remover.src = 'assets/excluir.png';
            remover.alt = 'Excluir';
            remover.style.cursor = 'pointer';
            remover.onclick = async () => {
                remove(i);
                await refresh();
            };
            rodape.append(remover);
        }

        const valorBox = document.createElement('div');
        valorBox.className = 'valor';
        const vh3 = document.createElement('h3');
        vh3.textContent = 'Valor';
        const vp = document.createElement('p');
        vp.textContent = `R$ ${toBRL(item.valor)}`;
        valorBox.append(vh3, vp);

        rodape.append(valorBox);
        card.append(h3, p, rodape);
        listaElement.appendChild(card);
    });

    if (subtotal){
        const total = itens.reduce((acc, cur) => acc + (cur.valor || 0), 0);
        subtotal.textContent = `Subtotal: R$ ${toBRL(total)}`;
    }
}

async function refresh() {
    if(isViewMode){
        setMode('list');
        await renderList();
        return;
    }

    if(hasItens()) {
        setMode('list');
        renderList();
    } else {
        setMode('form');
    }
}

if(addButton){
    addButton.onclick = () => {
        const nome = String(inputNome?.value||'').trim();
        const detalhes = String(inputDetalhes?.value||'').trim() || null;
        const valor = inputValor?.value;

        add({ nome, detalhes, valor });

        if(inputNome) inputNome.value = '';
        if(inputDetalhes) inputDetalhes.value = '';
        if(inputValor) inputValor.value = '';

        refresh();
    };
}

if(newItemButton){
    newItemButton.onclick = () => setMode('form');
}

if (saveButton){
  saveButton.onclick = () => {
    // se veio do verDocumento (view), volta para ele com o mesmo id; senão, volta para adicionarDocumentos
    const back = isViewMode
      ? (docId ? `verDocumento.html?id=${docId}` : 'verDocumento.html')
      : 'adicionarDocumentos.html';
    window.location.href = back;
  }
};

refresh();