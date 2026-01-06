const listEl = document.querySelector('.list');
const searchInput = document.querySelector('.search-box input');
const filterButton = document.querySelector('.filter-btn');
const filterPanel = document.querySelector('#filterPanel');

let currentStatus = 'recentes';
let currentQuery = '';
let selectedStatus = new Set();

function statusClass(s){
    if (s === "Pendente") return 'pending';
    if (s === "Concluído") return 'completed';
    if (s === "Em Andamento") return 'progress';
    if (s === "Orçamento") return 'budget';
}

function fmtDate(iso) {
    if(!iso) return '';

    const d = new Date(iso);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth()+1).padStart(2,'0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
}

function renderList(items){
    listEl.innerHTML = '';
    if(!items?.length){
        const empty = document.createElement('div');
        empty.style.gridColumn = '1 / -1';
        empty.style.textAlign = 'center';
        empty.style.color = '#6b7280';  // mesmo tom do exemplo
        empty.style.padding = '24px';
        empty.style.fontWeight = '600';
        empty.style.display = 'grid';
        empty.textContent = 'Nenhum documento encontrado.';
        listEl.appendChild(empty);
        return;
    }

    items.forEach(doc => {
        const card = document.createElement('div');
        card.className = 'doc-card';
        card.innerHTML = `
            <div class="status-bar ${statusClass(doc.statusDocumento)}"></div>
            <div class="doc-content">
                <strong>${doc.statusDocumento}</strong>
                <div>${doc.nomeCliente}</div>
                <div>${doc.nomeDocumento}</div>
                <div>Criado em ${fmtDate(doc.dataCriado)}</div>
            </div>
        `;

        card.addEventListener('click', () => {
            window.location.href = 'verDocumento.html?id=' + encodeURIComponent(doc.idDocumento);
        });
        listEl.appendChild(card);
    });
}

async function filtrar(){
    const status = [...selectedStatus];
    const rows = await window.api.listDocumentos.list({ query: currentQuery, status, limit:200 });
    renderList(rows);
}

// busca
let t = null;
searchInput?.addEventListener('input', () => {
    currentQuery = (searchInput.value || '').trim();
    clearTimeout(t);
    t = setTimeout(filtrar, 200);
});

// filtro
filterButton?.addEventListener('click', (e) =>{
    e.stopPropagation();
    filterPanel.hidden = !filterPanel.hidden;
    filterButton.setAttribute('aria-expanded', String(!filterPanel.hidden));
});

document.addEventListener('click', (e)=>{
    if(!filterPanel.contains(e.target) && !filterButton.contains(e.target)) {
        filterPanel.hidden = true;
        filterButton.setAttribute('aria-expanded', 'false');
    }
});

filterPanel?.addEventListener('change', (e)=>{
    if(e.target?.type === 'checkbox') {
        const val = e.target.value;
        if(e.target.checked) selectedStatus.add(val);
        else selectedStatus.delete(val);
        filtrar();
    }
});

filtrar();