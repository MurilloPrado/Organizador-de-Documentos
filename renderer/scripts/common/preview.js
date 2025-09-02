export default function renderFilePreview(container, file) {
    const ext = file.name.split('.').pop().toLowerCase();
    const box = document.createElement('div');
    box.className = 'file-preview';
    if (['png', 'jpg', 'jpeg','webp'].includes(ext)) {
        const img = document.createElement('img');
        img.src = URL.createObjectURL(file);
        img.alt = file.name;
        box.appendChild(img);
    } else {
        const span = document.createElement('span');
        span.textContent = `${file.name}`;
        box.appendChild(span);
    }
    container.appendChild(box);
}

/* ADIÇÃO FUTURA: suporte a PDF com paginação
// /renderer/common/preview.js
// Renderização de prévias de arquivos (imagens e PDFs com paginação)

const IMAGE_EXTS = ['png','jpg','jpeg','webp'];
/**
 * Renderiza preview de arquivo dentro do container.
 * - Imagens: <img>
 * - PDF: mini-viewer com paginação
 * - Outros: ícone/label

export default async function renderFilePreview(container, file) {
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  const box = document.createElement('div');
  box.className = 'file-preview'; // estilize via CSS (tamanho, borda, etc.)

  if (IMAGE_EXTS.includes(ext)) {
    renderImage(box, file);
  } else if (ext === 'pdf') {
    await renderPdfViewer(box, file);
  } else {
    renderGeneric(box, file);
  }

  container.appendChild(box);
}

/* ========== IMAGEM ========== 
function renderImage(box, file) {
  const url = URL.createObjectURL(file);
  const img = document.createElement('img');
  img.src = url;
  img.alt = file.name;
  img.onload = () => URL.revokeObjectURL(url);
  box.appendChild(img);

  // legenda opcional
  const cap = document.createElement('div');
  cap.className = 'fp-caption';
  cap.textContent = file.name;
  box.appendChild(cap);
}

/* ========== ARQUIVOS NÃO SUPORTADOS (label) ========== /
function renderGeneric(box, file) {
  const row = document.createElement('div');
  row.className = 'fp-generic';
  row.textContent = `📄 ${file.name}`;
  box.appendChild(row);
}

/* ========== PDF VIEWER ==========/
async function renderPdfViewer(box, file) {
  // import dinâmico do pdfjs para não pesar a página se não for PDF
  const pdfjsLib = await import('pdfjs-dist/build/pdf.mjs');
  // apontar o worker (necessário para parsing off-thread)
  const workerSrc = (await import('pdfjs-dist/build/pdf.worker.mjs')).default;
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

  const blobUrl = URL.createObjectURL(file);
  const loadingTask = pdfjsLib.getDocument({ url: blobUrl });
  const pdf = await loadingTask.promise;

  // UI container
  const viewer = document.createElement('div');
  viewer.className = 'fp-pdf';

  // toolbar simples
  const toolbar = document.createElement('div');
  toolbar.className = 'fp-toolbar';

  const btnPrev = document.createElement('button'); btnPrev.textContent = '◀';
  const btnNext = document.createElement('button'); btnNext.textContent = '▶';
  const pageInput = document.createElement('input'); pageInput.type = 'number'; pageInput.min = '1'; pageInput.value = '1';
  const pageTotal = document.createElement('span'); pageTotal.textContent = `/ ${pdf.numPages}`;
  const zoomOut = document.createElement('button'); zoomOut.textContent = '−';
  const zoomIn  = document.createElement('button'); zoomIn.textContent  = '+';

  toolbar.append(btnPrev, btnNext, pageInput, pageTotal, zoomOut, zoomIn);

  // canvas
  const canvasWrap = document.createElement('div');
  canvasWrap.className = 'fp-canvas-wrap';
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  canvasWrap.appendChild(canvas);

  // legenda opcional
  const cap = document.createElement('div');
  cap.className = 'fp-caption';
  cap.textContent = file.name;

  viewer.append(toolbar, canvasWrap, cap);
  box.appendChild(viewer);

  let currentPage = 1;
  let scale = 1.0; // zoom

  async function renderPage(n) {
    // clamp
    if (n < 1) n = 1;
    if (n > pdf.numPages) n = pdf.numPages;

    const page = await pdf.getPage(n);
    const viewport = page.getViewport({ scale });
    const dpr = window.devicePixelRatio || 1;

    canvas.width = Math.floor(viewport.width * dpr);
    canvas.height = Math.floor(viewport.height * dpr);
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;

    const renderContext = {
      canvasContext: ctx,
      transform: [dpr, 0, 0, dpr, 0, 0], // HiDPI
      viewport
    };
    await page.render(renderContext).promise;

    currentPage = n;
    pageInput.value = String(n);
  }

  // Controles
  btnPrev.onclick = () => renderPage(currentPage - 1);
  btnNext.onclick = () => renderPage(currentPage + 1);
  pageInput.onchange = () => renderPage(parseInt(pageInput.value, 10) || 1);
  zoomIn.onclick = () => { scale = Math.min(scale + 0.2, 4); renderPage(currentPage); };
  zoomOut.onclick = () => { scale = Math.max(scale - 0.2, 0.4); renderPage(currentPage); };

  // Navegação por teclado (←/→; Ctrl+Scroll para zoom)
  viewer.tabIndex = 0;
  viewer.onkeydown = (e) => {
    if (e.key === 'ArrowLeft')  renderPage(currentPage - 1);
    if (e.key === 'ArrowRight') renderPage(currentPage + 1);
  };
  viewer.onwheel = (e) => {
    if (e.ctrlKey) {
      e.preventDefault();
      const delta = Math.sign(e.deltaY);
      scale = Math.min(Math.max(scale + (delta > 0 ? -0.1 : 0.1), 0.4), 4);
      renderPage(currentPage);
    }
  };

  // Render inicial
  await renderPage(1);

  // cleanup quando trocar de arquivo ou sair da página
  const revoke = () => URL.revokeObjectURL(blobUrl);
  // opcional: expor uma API para destruir viewer se desejar
  viewer._destroy = () => { revoke(); };
}

*/