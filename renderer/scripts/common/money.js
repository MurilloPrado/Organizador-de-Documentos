// Converte uma string numérica com vírgula para número
export const toNumber = v => Number(String(v).replace(',', '.')) || 0;
export const toBRL = n => (n??0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });