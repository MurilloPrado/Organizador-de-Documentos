document.addEventListener('DOMContentLoaded', async () => {
const modal = document.getElementById('diretorioPadrao');
const buttonEscolher = document.getElementById('escolherDiretorio');
const buttonEscolherAlt = document.getElementById('escolherDiretorioButton');

async function verificaDiretorio() {
    function showModal() { modal.classList.add('is-open'); }
    function hideModal() { modal.classList.remove('is-open'); }

    try {
    const dir = await window.api.settings.getDirectory();
    dir && dir.trim() ? hideModal() : showModal();
    } catch (e) {
    console.error('Falha ao verificar diretório padrão:', e);
    showModal();
    }
}

async function escolherDiretorioHandler() {
    const chosen = await window.api.settings.chooseDirectory();
    if (!chosen) return;
    await window.api.settings.setDirectory(chosen);
    document.getElementById('diretorioPadrao').style.display = 'none';
}

if (buttonEscolher) buttonEscolher.addEventListener('click', escolherDiretorioHandler);
if (buttonEscolherAlt) buttonEscolherAlt.addEventListener('click', escolherDiretorioHandler);

await verificaDiretorio();
});

