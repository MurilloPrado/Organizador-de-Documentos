const Nome = document.getElementById('nome');
const Tel  = document.getElementById('tel');
const SaveButton = document.getElementById('save-button');

//evita campos com espaços
function norm(value) {
  return String(value ?? '').trim();
}

/**
 * Desabilita/habilita o botão enquanto salva, para evitar cliques duplicados.
 * Também troca o texto do botão para feedback ao usuário.
 */
function setSaving(isSaving) {
  if (!SaveButton) return;
  SaveButton.disabled = isSaving;
  SaveButton.textContent = isSaving ? 'Salvando…' : 'Salvar cliente';
}

//alerta de erro
function showError(msg) {
  alert(msg);
}


async function handleSalvar() {
  const nome = norm(Nome?.value);
  const tel  = norm(Tel?.value);

  if (!nome) {
    showError('Informe o nome do cliente.');
    Nome?.focus();
    return;
  }

  try {
    setSaving(true);
    // Chamada ao backend (ipcMain.handle('clientes:create', ...))
    await window.api.clientes.create({ nome, tel });

    // Opcional: limpar o formulário antes de sair
    //Nome.value = '';
    //if (Tel) Tel.value = '';

    // Redireciona para a lista de clientes
    window.location.href = 'clientes.html';
  } catch (err) {
    console.error('[clientes] erro ao salvar:', err);
    showError('Falha ao salvar cliente. Tente novamente.');
  } finally {
    setSaving(false);
  }
}

/**
 * Liga o evento de clique quando a página estiver pronta.
 */
document.addEventListener('DOMContentLoaded', () => {
  if (!SaveButton) {
    console.warn('[clientes] Botão #btnSalvar não encontrado.');
    return;
  }
  SaveButton.addEventListener('click', (e) => {
    e.preventDefault(); // evita submit padrão, já que não estamos usando <form>
    handleSalvar();
  });
});
