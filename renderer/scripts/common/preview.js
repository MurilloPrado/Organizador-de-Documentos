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