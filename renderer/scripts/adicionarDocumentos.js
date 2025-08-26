const tituloDocumento = document.getElementById("titulo-documento");
const tituloInput = document.getElementById("titulo-input");
const editar = document.getElementById("editar");

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
