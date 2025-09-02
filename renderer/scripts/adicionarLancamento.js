import{ KEY, pushArray, setArray, removeArray, getArray } from './common/localStorage.js';
import { toNumber, toBRL } from './common/money.js';

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
    const showForm = mode === 'form';
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

        const remover = document.createElement('img');
        remover.src = 'assets/excluir.png';
        remover.alt = 'Excluir';
        remover.style.cursor = 'pointer';
        remover.onclick = () => {
            remove(i);
            refresh();
        };

        const valorBox = document.createElement('div');
        valorBox.className = 'valor';
        const vh3 = document.createElement('h3');
        vh3.textContent = 'Valor';
        const vp = document.createElement('p');
        vp.textContent = `R$ ${toBRL(item.valor)}`;
        valorBox.append(vh3, vp);

        rodape.append(remover, valorBox);
        card.append(h3, p, rodape);
        listaElement.appendChild(card);
    });

    if (subtotal){
        const total = itens.reduce((acc, cur) => acc + (cur.valor || 0), 0);
        subtotal.textContent = `Subtotal: R$ ${toBRL(total)}`;
    }
}

function refresh() {
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

if(saveButton){
    saveButton.onclick = () => {
        window.location.href = 'adicionarDocumentos.html';
    }
};

refresh();