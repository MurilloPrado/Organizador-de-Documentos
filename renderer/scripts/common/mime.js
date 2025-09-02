// Mapeamento simples de extensões para tipos MIME(formatos de arquivos)

// Tipos MIME comuns
const map = { 
    pdf: 'application/pdf', 
    doc: 'application/msword', 
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
    jpg: 'image/jpeg', 
    jpeg: 'image/jpeg', 
    png: 'image/png', 
};

// Encontra o formato do arquivo a partir do nome
export const guessMimeFromName = (name) => map[name.split('.').pop().toLowerCase()] || 'application/octet-stream';