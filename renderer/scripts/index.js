if (window.electronAPI && window.electronAPI.onUpdateStatus) {
  window.electronAPI.onUpdateStatus((data) => {
    const box = document.getElementById('update-box');
    const barFill = document.querySelector('.update-bar-fill');
    const text = document.getElementById('update-text');

    if (!box || !barFill || !text) return;

    // sempre mostra quando tiver algum evento de update
    box.style.display = 'flex';

    if (data.status === 'checking') {
      text.textContent = 'Procurando atualizações...';
      barFill.style.width = '20%';
    }

    if (data.status === 'available') {
      text.textContent = 'Atualização encontrada. Iniciando download...';
      barFill.style.width = '25%';
    }

    if (data.status === 'downloading') {
      const pct = data.progress ?? 0;
      text.textContent = `Atualização em andamento (${pct}%)`;
      barFill.style.width = pct + '%';
    }

    if (data.status === 'downloaded') {
      text.textContent = 'Download concluído. Reinicie para aplicar.';
      barFill.style.width = '100%';
      // se quiser esconder depois de alguns segundos:
      setTimeout(() => {
        box.style.display = 'none';
      }, 6000);
    }

    if (data.status === 'error') {
      text.textContent = 'Erro ao atualizar: ' + (data.message || '');
      barFill.style.width = '0%';
    }
  });
}
