// src/services/excelService.js
const ExcelJS = require('exceljs');
const { app } = require('electron');
const path = require('path');
const fs = require('fs');

function formatCpfCnpj(value) {
  const v = String(value).replace(/\D/g, '');

  if (v.length === 11) {
    return v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }

  if (v.length === 14) {
    return v.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }

  return value;
}

function formatPhone(value) {
  const v = String(value).replace(/\D/g, '');

  if (v.length === 11) {
    return v.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }

  return value;
}

function formatDateBR(date) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d)) return date;

  return d.toLocaleDateString('pt-BR');
}

function gerarNomeSeguro(texto) {
  return String(texto)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .trim();
}

async function generateExcel(data) {
  const isDev = !app.isPackaged;

  const template = app.isPackaged
    ? path.join(process.resourcesPath, 'templates/FICHA DE IMÓVEL.xlsx') // BUILD
    : path.join(__dirname, '../../templates/FICHA DE IMÓVEL.xlsx');     // DEV

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(template);

  const ws = workbook.worksheets[0];

  // =========================
  // CAMPOS FIXOS
  // =========================
  const map = {
    nomeCliente: 'B3',
    contato: 'B4',
    status: 'C11',
    detalhesDocumento: 'A37',
    valorTotal: 'C44'
  };

  Object.entries(map).forEach(([key, cell]) => {
    if (!data[key]) return;
    ws.getCell(cell).value = data[key];
  });

  // =========================
  // CPF OU CNPJ
  // =========================
  if (data.cpfCnpj) {
    const isCnpj = String(data.cpfCnpj).length > 11;

    ws.getCell('A5').value = isCnpj ? 'CNPJ:' : 'CPF:';
    ws.getCell('B5').value = formatCpfCnpj(data.cpfCnpj);
  }

  ws.getCell('G4').value = formatPhone(data.telefone);
  ws.getCell('A11').value = formatDateBR(data.data);

  // =========================
  // ENDEREÇO
  // =========================
  if (data.endereco) {
    const e = data.endereco;

    ws.getCell('B6').value = [
        data.endereco?.rua,
        data.endereco?.numero,
    ].filter(Boolean).join(', ');
    ws.getCell('B7').value = data.endereco?.bairro;
    ws.getCell('G7').value = data.endereco?.cidade;
  }

  // =========================
  // SERVIÇOS
  // =========================
  const adicionais = {
    topografia: false,
    arquiteto: false,
    engenheiro: false
  };

  data.servicos.forEach(s => {
    const nome = String(s.tituloLancamento || '').toLowerCase();

    if (nome.includes('topografia')) adicionais.topografia = true;
    if (nome.includes('arquiteto')) adicionais.arquiteto = true;
    if (nome.includes('engenheiro')) adicionais.engenheiro = true;
  });

  const servicosVisiveis = data.servicos.filter(s => {
    const nome = String(s.tituloLancamento || '').toLowerCase();

      return ![
        'topografia',
        'arquiteto',
        'engenheiro'
      ].some(p => nome.includes(p));
  });

  let row = 18;

  servicosVisiveis.forEach(s => {
    const texto = [
      ` - ${s.tituloLancamento}`
    ].filter(Boolean).join('\n');

    const cell = ws.getCell(`A${row}`);

    cell.value = texto;

    cell.alignment = {
      wrapText: true,
      vertical: 'top'
    };

    row++;
  });

  const adicionaisMap = {
    topografia: 'C26',
    arquiteto: 'C27',
    engenheiro: 'C28'
  };

  Object.entries(adicionaisMap).forEach(([key, cell]) => {
    if (adicionais[key]) {
      ws.getCell(cell).value = 'X';
    }
  });

  // =========================
  // CHECKLIST
  // =========================
  const checklistMap = {
    projetoAprovado: { trueCell: 'E32', falseCell: 'G32' },
    regularizacao: { trueCell: 'E33', falseCell: 'G33' },
    certidoes: { trueCell: 'E34', falseCell: 'G34' }
    };

    Object.entries(checklistMap).forEach(([key, map]) => {
    if (data.checklist[key]) {
        ws.getCell(map.trueCell).value = 'X';
    } else {
        ws.getCell(map.falseCell).value = 'X';
    }
  });

  // =========================
  // Detalhes
  // =========================
  const cell = ws.getCell('A37');

  cell.alignment = {
    wrapText: true,
    vertical: 'top'
  };

  // =========================
  // OUTPUT
  // =========================
  const pastaDocumento = data.pastaDocumento;

  if (!pastaDocumento) {
    throw new Error('Pasta do documento não definida');
  }

  // garante pasta
  if (!fs.existsSync(pastaDocumento)) {
    fs.mkdirSync(pastaDocumento, { recursive: true });
  }

  const fileName = `FICHA DE IMÓVEL - ${data.nomeCliente}.xlsx`;
  const output = path.join(pastaDocumento, fileName);

  if (fs.existsSync(output)) {
    fs.unlinkSync(output);
  }

  try {
    await workbook.xlsx.writeFile(output);
  } catch (err) {
    if (err.code === 'EBUSY') {
      throw new Error('Feche o arquivo do Excel antes de gerar o relatório.');
    }
    throw err;
  }
  return output;
}

module.exports = { generateExcel };