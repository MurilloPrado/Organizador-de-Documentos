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
  else if (window.location.pathname.includes('despesas')) tipoLancamento = 'despesas';
  else tipoLancamento = 'servico'; // padrão
}

const headerEl = document.querySelector('header');
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
    despesas: KEY.despesas,
}

const currentKey = () => {
    const fromSelect = String(tipoElement?.value||'').toLowerCase();
    const t = fromSelect || tipoLancamento;
    return MAP[t] || KEY.servicos;
}

// edição de item
let editIndex = null // modo create
let editIdLancamento = null // modo view

// Formata o campo de valor enquanto o usuário digita
if(inputValor) inputValor.addEventListener('input', () => {
    const digitos = inputValor.value.replace(/\D/g, '');
    const numero = Number(digitos) / 100;
    inputValor.value = toBRL(numero);
});

updateTopLink();

// troca icone
function isFormVisible() {
    return !!formContainer && getComputedStyle(formContainer).display !== 'none';
}

function updateTopLink() {
    if(!topLink) return;

    const imgEl = topLink.querySelector('img');

    if(isViewMode){
    if(isFormVisible()){
        topLink.href = '#';
        topLink.innerHTML = `<img src="assets/x.png" alt="cancelar" class="cancel-button">`;
        topLink.classList.remove('back-button');
        topLink.classList.add('cancel-button');
        topLink.onclick = (e) => {
        e.preventDefault();
        setMode('list');
        updateTopLink();
        };
    } else {
        topLink.onclick = null;
        topLink.href = docId ? `verDocumento.html?id=${docId}` : 'verDocumento.html';
        topLink.innerHTML = '&#x25C0;'; // ◀
        topLink.classList.remove('cancel-button');
        topLink.classList.add('back-button');
    }
  } else {
    const hasItems =
        (typeof getAll === 'function' ? getAll().length > 0 : ((getArray?.(currentKey()) || []).length > 0));

    if (hasItems && isFormVisible()) {
        topLink.href = '#';
        topLink.innerHTML = `<img src="assets/x.png" alt="cancelar" class="cancel-button">`;
        topLink.classList.add('cancel-button');
        topLink.classList.remove('back-button');
        topLink.onclick = (e) => {
        e.preventDefault();
        setMode('list');
        updateTopLink();
      };
    } else {
        topLink.onclick = null;
        topLink.href = 'adicionarDocumentos.html';
        topLink.innerHTML = `<img src="assets/x.png" alt="cancelar" class="cancel-button">`;
        topLink.classList.add('cancel-button');
        topLink.classList.remove('back-button');
    }
  }
}         

// menu
let headerDeleteButton = null
if(headerEl && isViewMode){
    headerDeleteButton = document.createElement('button');
    headerDeleteButton.type = 'button';
    headerDeleteButton.id = 'kebabButton';
    headerDeleteButton.className = 'kebab-button';
    headerDeleteButton.innerHTML = `<img src="assets/excluir.png" alt="Excluir">`;
    headerEl.appendChild(headerDeleteButton);

    // abre menu
    headerDeleteButton.addEventListener('click', () => {
        isDeleting = !isDeleting
        refresh();
        updateKebabIcon();
    });

    updateKebabIcon();
}

function updateKebabIcon() {
    if (!kebabButton) return;

   if (isDeleting) {
        // X grande e legível
        headerDeleteButton.innerHTML = '✕';
        headerDeleteButton.title = 'Cancelar excluir';
        headerDeleteButton.style.fontSize = '30px';
    } else {
        // volta ao ícone de lixeira
        headerDeleteButton.innerHTML = `<img src="assets/excluir.png" alt="Excluir" style="width:20px;height:20px;vertical-align:middle">`;
        headerDeleteButton.title = 'Excluir itens';
        headerDeleteButton.style.fontSize = '';
        headerDeleteButton.style.padding = '';
    }
}

function getAll() {
    return getArray(currentKey()) || [];
}

function setAll(a){
    return setArray(currentKey(), a);
}

// adiciona ao localStorage quando no modo create
export function add({ nome, detalhes, valor }) {
    console.log({ nome, detalhes, valor });
    return pushArray(currentKey(), {
        tipo: String(tipoElement.value),
        nome: String(nome||'').trim() || 'Sem nome',
        detalhes: String(detalhes||'').trim() || null,
        valor: toNumber(valor),
    });
}

// adiciona ao banco de dados quando no modo view
async function addLancamentosToDB({ nome, detalhes, valor }) {
    if(!isViewMode || !docId || !window.api?.documentos?.addLancamento) return;

    const payload = {
        idDocumento: docId,
        tipoLancamento: tipoLancamento,
        tituloLancamento: String(nome||'').trim() || 'Sem nome',
        detalhes: detalhes || null,
        valor: toNumber(valor) || 0,
        createdAt: new Date().toISOString(),
    };

    await window.api.documentos.addLancamento(payload);
}

// atualiza db
async function updateLancamentoDB({ idLancamento, nome, detalhes, valor }) {
    if(!isViewMode || !docId) return;
    if (window.api?.documentos?.updateLancamento){
        const payload = {
            idLancamento: Number(idLancamento),
            tituloLancamento: String(nome||'').trim() || 'Sem nome',
            detalhes: detalhes || null,
            valor: toNumber(valor) || 0,
        };
        await window.api.documentos.updateLancamento(payload);
        return true;
    }
    return false;
}

// lista todos os itens
export function list() {
    return getAll();
}

// busca no banco de dados os lançamentos
async function fetchLancamentosFromDB() {
    if(!isViewMode || !docId || !window.api?.documentos?.getById) return [];

    const res = await window.api.documentos.getById(docId);
    const rows = res?.lancamentos || [];

    return rows
        .filter(r => String(r.tipoLancamento).toLowerCase() === tipoLancamento)
        .map(r => ({
            idLancamento: r.idLancamento,
            nome: r.tituloLancamento,
            detalhes: r.detalhes,
            valor: r.valor,
        }));
}

// remove do localStorage quando no modo create
export function remove(index){
    return removeArray(currentKey(), index);
}

// remove do banco de dados quando no modo view
async function removeLancamentoFromDB(idLancamento) {
    if(!isViewMode || !window.api?.documentos?.deleteLancamento) return;
    await window.api.documentos.deleteLancamento(Number(idLancamento));
}


function setMode(mode){
    const showForm = mode === 'form';
    if(formContainer) formContainer.style.display = showForm ? 'block' : 'none';
    if(listContainer) listContainer.style.display = showForm ? 'none' : 'block';
    updateTopLink();
}

function hasItens(){
    return getAll().length > 0;
}

// entra no modo edição
function enterEdit(item, index){
    if(inputNome) inputNome.value = item.nome || '';
    if(inputDetalhes) inputDetalhes.value = item.detalhes || '';
    if(inputValor) inputValor.value = toBRL(item.valor || 0);

    if(isViewMode) {
        editIdLancamento = item.idLancamento || null;
        editIndex = null;
    } else {
        editIndex = index;
        editIdLancamento = null;
    }

    if(addButton) addButton.textContent = 'Salvar alterações';

    setMode('form');
    updateTopLink();
}

async function renderList() {
    if(!listContainer) return;
    const itens = isViewMode ? await fetchLancamentosFromDB() : getAll();
    listaElement.innerHTML = '';

    if(!itens || itens.length === 0) {
        if(formContainer) formContainer.style.display = 'none';
        if(listContainer) listContainer.style.display = 'block';

        listaElement.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1;text-align:center;color:#6b7280;padding:24px;font-weight:600;">
        ${ tipoLancamento === 'taxa' ? 'Não existem taxas adicionadas.' : tipoLancamento === 'despesas' ? 'Não existem despesas adicionadas.' : 'Não existem serviços adicionados.' }
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
            remover.className = 'itemIcons';
            remover.onclick = async () => {
                if(isViewMode){
                    const ok = await window.electronAPI.confirm('Tem certeza que deseja excluir?');
                    isDeleting = false;

                    if(!ok) return refresh();
                    if(item.idLancamento){
                        await removeLancamentoFromDB(item.idLancamento);
                        await refresh();
                    }
                } else{
                    remove(i);
                    await refresh();
                }
            };
            rodape.append(remover);
        }

        if(!isDeleting){
            const edit = document.createElement('img');
            edit.src = 'assets/edit.png';
            edit.alt = 'Editar';
            edit.title = 'Editar';
            edit.style.cursor = 'pointer';
            edit.className = 'itemIcons';
            edit.onclick = () => {
                enterEdit(item, i);
            };
            rodape.append(edit);
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
        const total = itens.reduce((acc, cur) => acc + (Number(cur.valor) || 0), 0);
        subtotal.textContent = `Subtotal: R$ ${toBRL(total)}`;
    }
}

async function refresh() {
    editIndex = null;
    editIdLancamento = null;
    if(addButton) addButton.textContent = (tipoLancamento === 'despesas' ? 'Cadastrar despesa' : tipoLancamento === 'taxa' ? 'Cadastrar taxa' : 'Cadastrar serviço');

    if(isViewMode){
        setMode('list');
        await renderList();
        updateTopLink();
        return;
    }

    if(hasItens()) {
        setMode('list');
        await renderList();
    } else {
        setMode('form');
    }

    updateKebabIcon();
}

if(addButton){
    addButton.onclick = async () => {
        const nome = String(inputNome?.value||'').trim();
        const detalhes = String(inputDetalhes?.value||'').trim() || null;
        const valor = inputValor?.value;

        if(editIndex !== null || editIdLancamento !== null) {
            // tenta atualizar no db
            if(isViewMode) {
                if(editIdLancamento) {
                    const ok = await updateLancamentoDB({
                        idLancamento: editIdLancamento,
                        nome,
                        detalhes,
                        valor
                    });
                if(!ok) {
                    alert('Edição não disponivel');
                    return;
                }
                
                // limpa campos
                editIdLancamento = null;
                if (inputNome) inputNome.value = '';
                if (inputDetalhes) inputDetalhes.value = '';
                if (inputValor) inputValor.value = '';
                if (addButton) addButton.textContent = (tipoLancamento === 'despesas' ? 'Cadastrar despesas' : tipoLancamento === 'taxa' ? 'Cadastrar taxa' : 'Cadastrar serviço');

                await refresh();
                return; 
                } else {
                    alert('Erro interno: id do lançamento para edição não definido.');
                    return;
                }
            } else {
                // modo create
                const all = getAll();
                if(editIndex >= 0 && editIndex < all.length) {
                    all[editIndex] = {
                        tipo: String(tipoElement.value),
                        nome: String(nome || '').trim() || 'Sem nome',
                        detalhes: String(detalhes || '').trim() || null,
                        valor: toNumber(valor),
                    };
                    setAll(all);
                    editIndex = null;
                    if(inputNome) inputNome.value = '';
                    if(inputDetalhes) inputDetalhes.value = '';
                    if(inputValor) inputValor.value = '';
                    await refresh();
                    return;
                } else {
                    alert('Índice inválido')
                    return;
                }
            }
        } 

        // adiciona novos itens
        if(isViewMode && docId){
            await addLancamentosToDB({ nome, detalhes, valor });
        } else {
            add({ nome, detalhes, valor });
        }

        if(inputNome) inputNome.value = '';
        if(inputDetalhes) inputDetalhes.value = '';
        if(inputValor) inputValor.value = '';

        await refresh();
    };
}

if(newItemButton){
    newItemButton.onclick = () => {
        // limpa campos
        editIndex = null;
        editIdLancamento = null;
        if (inputNome) inputNome.value = '';
        if (inputDetalhes) inputDetalhes.value = '';
        if (inputValor) inputValor.value = '';
        if (addButton) addButton.textContent = (tipoLancamento === 'despesas' ? 'Cadastrar despesa' : tipoLancamento === 'taxa' ? 'Cadastrar taxa' : 'Cadastrar serviço');

        setMode('form');
        updateTopLink();
    };
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