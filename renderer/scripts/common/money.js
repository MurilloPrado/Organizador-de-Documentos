// Converte uma string numérica com vírgula para número
export const toNumber = (v) => {
    const s = String(v ?? '')
      .replace(/[^\d,.,-]/g, '') // remove "R$", espaços etc.
      .replace(/\.(?=\d{3}(?:\D|$))/g, '') // remove pontos de milhar
      .replace(',', '.'); // vírgula decimal -> ponto
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : 0;
};
export const toBRL = n =>
  Number(n ?? 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });