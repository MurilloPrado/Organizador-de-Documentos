const path = require('path');
const fs = require('fs');
const { generateExcel } = require('../services/excelService');

function gerarNomeSeguro(texto) {
  return String(texto)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function encontrarPastaCliente(baseDir, nomeCliente, idCliente) {
  const nomeSeguro = gerarNomeSeguro(nomeCliente);

  const caminhoSomenteNome = path.join(baseDir, nomeSeguro);

  if (fs.existsSync(caminhoSomenteNome)) {
    return caminhoSomenteNome;
  }

  const caminhoComId = path.join(baseDir, `${nomeSeguro}-${idCliente}`);

  if (fs.existsSync(caminhoComId)) {
    return caminhoComId;
  }

  throw new Error('Pasta do cliente não encontrada');
}

module.exports = (ipcMain, db) => {
  ipcMain.handle('relatorio:gerar', async (_, documentId) => {
    const documento = db.prepare(`
      SELECT * FROM documentos WHERE idDocumento = ?
    `).get(documentId);

    if (!documento) throw new Error('Documento não encontrado');

    const clienteFull = db.prepare(`
      SELECT 
        c.*, 
        ct.nome AS contatoNome,
        ct.tel AS contatoTel,
        e.rua, e.numero, e.bairro, e.cidade
      FROM clientes c
      LEFT JOIN contato ct ON ct.idCliente = c.idCliente
      LEFT JOIN endereco e ON e.idCliente = c.idCliente
      WHERE c.idCliente = ?
    `).get(documento.idCliente);

    const lancamentos = db.prepare(`
      SELECT * FROM lancamentos WHERE idDocumento = ?
    `).all(documentId);

    const servicos = lancamentos.filter(l => l.tipoLancamento === 'servico');

    const baseDir = db.prepare('SELECT caminho FROM diretorioPadrao WHERE id = 1').get()?.caminho;
    if (!baseDir) throw new Error('Diretório padrão não configurado');

    const pastaCliente = encontrarPastaCliente(
      baseDir,
      clienteFull.nome,
      documento.idCliente
    );

    const pastaDocumento = path.join(
      pastaCliente,
      gerarNomeSeguro(documento.nomeDocumento)
    );

    const data = {
      nomeCliente: clienteFull?.nome,
      contato: clienteFull?.contatoNome,
      telefone: clienteFull?.tel,

      cpfCnpj: clienteFull?.cadastroGeral,

      endereco: {
        rua: clienteFull?.rua,
        numero: clienteFull?.numero,
        bairro: clienteFull?.bairro,
        cidade: clienteFull?.cidade
      },

      data: documento?.dataCriado,
      status: documento?.statusDocumento,
      detalhesDocumento: documento?.detalhes,

      servicos,
      checklist: JSON.parse(documento?.checklist || '{}'),

      pastaDocumento,

      valorTotal: servicos.reduce((acc, s) => acc + (Number(s.valor) || 0), 0),
    };

    return await generateExcel(data);
  });
};