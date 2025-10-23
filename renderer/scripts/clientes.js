//Busca clientes no banco e lista na página

// Seleciona o container onde os cards vão ser inseridos
const container = document.getElementById('cliente-container');
const input = document.querySelector('.search-box input');

function formatPhone(v) {
  const d = String(v ?? '').replace(/\D+/g, '');
  if (d.length === 10) {
    return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6,10)}`;
  }
  if (d.length === 11) {
    return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7,11)}`;
  }
  return v || '-';
}

// Função para escapar HTML e evitar XSS
function safe(v) {
  return String(v ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
};


// Função para criar o HTML de um card
function renderCard(cliente) {
  return `
    <div class="preview-cliente" data-id="${safe(cliente.id)}">
      <div>
        <h3>${safe(cliente.nome)}</h3>
        <p>${safe(formatPhone(cliente.tel))}</p>
      </div>
      <img src="assets/seta.png">
    </div>
  `;
}

//Carrega os clientes
async function carregarClientes(query = '') {
  try {
    const clientes = await window.api.clientes.list({ query, limit: 200 });
    container.innerHTML = clientes.length
      ? clientes.map(renderCard).join('')
      : '<p>Nenhum cliente encontrado.</p>';
  } catch (err) {
    console.error('Erro ao carregar clientes:', err);
    container.innerHTML = '<p>Erro ao carregar clientes.</p>';
  }
}

container.addEventListener('click', (e) => {
  const card = e.target.closest('.preview-cliente');
  if (!card) return;
  const id = card.getAttribute('data-id');
  if (!id) return;

  // redireciona para o modo "view"
  window.location.href = `adicionarClientes.html?id=${encodeURIComponent(id)}`;
});

let t;
input.addEventListener('input', () => {
  clearTimeout(t);
  const q = input.value || '';
  t = setTimeout(() => carregarClientes(q), 200);
});


document.addEventListener('DOMContentLoaded', () => carregarClientes(''));
