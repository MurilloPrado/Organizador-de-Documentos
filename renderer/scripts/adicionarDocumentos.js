const tituloDocumento = document.getElementById("titulo-documento");
const tituloInput = document.getElementById("titulo-input");
const editar = document.getElementById("editar");
const clienteInput = document.getElementById("clienteInput");
const fileInput = document.getElementById("fileInput");
const previewArquivo = document.querySelector(".preview-arquivo");

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

// Texto padrão
const tituloPadrao = "Documento";

const salvarTitulo = () => {
        // Pega o texto do input
    const novoTexto = tituloInput.value.trim();

    // Se o input estiver vazio, volta ao texto padrão, se não, usa o texto do input
    if (novoTexto === "") {
        tituloDocumento.textContent = tituloPadrao;
    } else {
        tituloDocumento.textContent = novoTexto;
    }

    // Esconde o input e mostra o título
    tituloInput.style.display = "none";
    editar.style.display = "block";
    tituloDocumento.style.display = "block";
};

editar.addEventListener("click", () => {
    const textoAtual = tituloDocumento.textContent;

    // Esconde o título e mostra o input
    tituloDocumento.style.display = "none";
    editar.style.display = "none";
    tituloInput.style.display = "block";

    // Verifica se o texto atual é o padrão, se não, mantém o texto
    if (textoAtual === tituloPadrao) {
        tituloInput.value = "";
    } else {
        tituloInput.value = textoAtual;
    }

    // Foca o input para edição imediata
    tituloInput.focus();
});

// Quando o input perder o foco, atualiza o título e esconde o input
tituloInput.addEventListener("blur", () => {
    salvarTitulo();
});

// Quando o usuário pressionar Enter, atualiza o título e esconde o input
tituloInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        salvarTitulo();
    }
});

function mostrarPreviewArquivo() {
    const arquivos = getJSON(LS_ARQUIVOS);
    previewArquivo.innerHTML = '';

    arquivos.foreach((f ) => {
        const elemento = document.createElement('div');
        elemento.classList.add('file-section');
}
