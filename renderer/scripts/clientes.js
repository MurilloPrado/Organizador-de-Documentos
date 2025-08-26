//Busca clientes no banco e lista na página

// Seleciona o container onde os cards vão ser inseridos
const container = document.getElementById('cliente-container');

// Função para escapar HTML e evitar XSS
function safe(v) {
  return String(v ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

// Função para criar o HTML de um card
function renderCard(cliente) {
  return `
    <div class="preview-cliente">
      <div>
        <h3>${safe(cliente.nome)}</h3>
        <p>${safe(cliente.tel || '-')}</p>
      </div>
      <img src="assets/seta.png">
    </div>
  `;
}

//Carrega os clientes
async function carregarClientes() {
  try {
    const clientes = await window.api.clientes.list();
    if (!clientes.length) {
      container.innerHTML = '<p>Nenhum cliente cadastrado.</p>';
      return;
    }
    container.innerHTML = clientes.map(renderCard).join('');
  } catch (err) {
    console.error('Erro ao carregar clientes:', err);
    container.innerHTML = '<p>Erro ao carregar clientes.</p>';
  }
}

document.addEventListener('DOMContentLoaded', carregarClientes);
