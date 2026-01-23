const { ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const fsp = require('fs/promises');

// Garante que o diretório exista
function garantirDiretorio(caminho) {
  if (!fs.existsSync(caminho)) {
    fs.mkdirSync(caminho, { recursive: true });
  }
}

// Converte nome em formato seguro para sistema de arquivos
function gerarNomeSeguro(texto) {
  return String(texto)
    .toLowerCase()
    .normalize('NFD') // Normaliza caracteres Unicode
    .replace(/[\u0300-\u036f]/g, '') // Remove acentuação
    .replace(/[^a-z0-9]+/g, '-') // Substitui caracteres inválidos por hífen
    .replace(/^-+|-+$/g, '') // Remove hífens do início e fim
    .replace(/\s+/g, '-') // Substitui espaços por hífen
    .trim(); // Remove espaços em branco do início e fim
}

// remove extensão
function ensureExt (name, fallbackExt) {
  const n = String (name || '').trim();
  const ext = path.extname(n);
  if(ext) return n; //ja tem extensão
  const f = String(fallbackExt || '');
  return f ? `${n}${f}` : n; // adiciona a extensão
}

// Cria a pasta do cliente, garantindo que não haja conflitos
function criarPastaCliente(diretorioBase, nomeCliente, idCliente) {
  const nomeClienteSeguro = gerarNomeSeguro(nomeCliente || 'cliente');
  const caminhoSomenteNome = path.join(diretorioBase, nomeClienteSeguro);

  // Se já existir uma pasta com esse nome, adiciona o ID do cliente para evitar conflito
  if (fs.existsSync(caminhoSomenteNome)) {
    const caminhoComId = path.join(diretorioBase, `${nomeClienteSeguro}-${idCliente}`);
    garantirDiretorio(caminhoComId);
    return caminhoComId;
  }

  garantirDiretorio(caminhoSomenteNome);
  return caminhoSomenteNome;
}

module.exports = (ipcMain, db) => {
  // Payload:
  //   nomeDocumento: string,
  //   nomeCliente: string,
  //   statusDocumento: string,
  //   detalhes: string,
  //   lancamentos: [
  //     { tipo: servico, , dataPrevista, dataPago }]
  //   arquivos: [
  //     { urlArquivo, tipoArquivo, tituloArquivo }]

  ipcMain.handle('documentos:create', async (_evt, payload) => {
    // Lê a pasta padrão
    const row = db.prepare('SELECT caminho FROM diretorioPadrao WHERE id = 1').get();
    if (!row?.caminho) {
      throw new Error('Diretório padrão não está configurado.');
    }
    const diretorioBase = row.caminho;

    let registroCliente = null;

    if (Number.isInteger(payload?.idCliente)) {
      registroCliente = db.prepare('SELECT idCliente AS id, nome FROM clientes WHERE idCliente = ?').get(payload.idCliente);
    }

    if (!registroCliente) {
      const nomeCliente = String(payload?.nomeCliente || '').trim();
      if (!nomeCliente) {
        throw new Error('Nome do cliente é obrigatório quando ID do cliente não é fornecido.');
      }
      registroCliente = db.prepare('SELECT idCliente AS id, nome FROM clientes WHERE nome = ?').get(nomeCliente);

      if (!registroCliente) {
        const resultadoCliente = db.prepare('INSERT INTO clientes (nome) VALUES (?)').run(nomeCliente);
        registroCliente = { id: resultadoCliente.lastInsertRowid, nome: nomeCliente };
      }
    }

    // cria a pasta do cliente
    const caminhoPastaCliente = criarPastaCliente(diretorioBase, registroCliente.nome, registroCliente.id);
    const pastaDocumento = gerarNomeSeguro(payload.nomeDocumento);
    const caminhoPastaDocumento = path.join(caminhoPastaCliente, pastaDocumento);
    garantirDiretorio(caminhoPastaDocumento);

    // Cria o documento no banco de dados
    const transacao = db.transaction(() => {
      const createdAt = payload.createdAt || new Date().toISOString();
      // Insere o documento
      const inserirDocumento = db.prepare(`
        INSERT INTO documentos (idCliente, nomeDocumento, dataCriado, statusDocumento, detalhes)
        VALUES (?, ?, COALESCE(?, datetime('now')), ?, ?)
      `);
      const resultadoDocumento = inserirDocumento.run(
        registroCliente.id,
        payload.nomeDocumento,
        payload.createdAt || null,
        payload.statusDocumento || 'Pendente',
        payload.detalhes || null,
      );
      const idDocumento = resultadoDocumento.lastInsertRowid;
      // Insere os arquivos relacionados
      if (Array.isArray(payload.lancamentos)) {
        const inserirLancamento = db.prepare(`
          INSERT INTO lancamentos (idDocumento, tipoLancamento, detalhes, valor, tituloLancamento, createdAt)
          VALUES (?, ?, ?, ?, ?, COALESCE(?, strftime('%Y-%m-%dT%H:%M:%fZ','now')))
        `);

        for (const item of payload.lancamentos) {
          inserirLancamento.run(
            idDocumento,
            item.tipoLancamento,
            item.detalhes || null,
            Number(item.valor) || 0,
            item.tituloLancamento || null,
            item.createdAt || null,
          );
        }
      }

      if (Array.isArray(payload.arquivos)) {
        const inserirArquivo = db.prepare(`
          INSERT INTO arquivosDocumento (idDocumento, urlArquivo, tipoArquivo, nomeArquivo)
          VALUES (?, ?, ?, ?)
        `);

        for (const arquivo of payload.arquivos) {
          const origem = String(arquivo.urlArquivo || '').trim();
          if (!origem) continue;

          const ext = path.extname(origem);
          const nomeEditado = String(arquivo.nomeArquivo || arquivo.tituloArquivo || '').trim();

          const nomeArquivo = nomeEditado ? ensureExt(nomeEditado, ext) : path.basename(origem);

          // Evita conflitos de nome
          const destinoArquivo = path.join(caminhoPastaDocumento, nomeArquivo);
          const destinoFinal = fs.existsSync(destinoArquivo)
            ? path.join(caminhoPastaDocumento, `doc-${idDocumento}-${nomeArquivo}`)
            : destinoArquivo;
          // Copia o arquivo para a pasta do cliente
          fs.copyFileSync(arquivo.urlArquivo, destinoFinal);
          inserirArquivo.run(
            idDocumento,
            destinoFinal,
            String(arquivo.tipoArquivo || 'arquivo'),
            path.basename(destinoFinal),
          );
        }
      }

      return { idDocumento, caminhoDestinoArquivos: caminhoPastaCliente };
    });

    return transacao();
  });

  // Retorna o último ID de documento inserido
  ipcMain.handle('documentos:getUltimoId', async (_evt) => {
    const row = db.prepare('SELECT MAX(idDocumento) as ultimo FROM documentos').get();
    return row?.ultimo || 0;
  });

  ipcMain.handle('documentos:getById', async (_event, idDocumento) => {
    const documento = db.prepare(`
      SELECT d.idDocumento, d.idCliente, d.nomeDocumento, d.dataCriado, d.statusDocumento, d.detalhes
      FROM documentos d
      WHERE d.idDocumento = ?
    `).get(idDocumento);

    if (!documento) return null;

    const cliente = db.prepare(`
      SELECT idCliente, nome
      FROM clientes
      WHERE idCliente = ?
    `).get(documento.idCliente);

    const arquivos = db.prepare(`
      SELECT idArquivo, idDocumento, urlArquivo, tipoArquivo, nomeArquivo
      FROM arquivosDocumento
      WHERE idDocumento = ?
      ORDER BY idArquivo ASC
    `).all(idDocumento);

    const pagamentos = db.prepare(`
      SELECT
        p.idPagamento       AS id,
        'pagamento'         AS tipo,
        p.tituloPagamento   AS titulo,
        p.valor             AS valor,
        p.detalhes          AS detalhes,
        p.metodoPagamento   AS metodoPagamento,
        p.dataPagamento     AS createdAt
      FROM pagamentos p
      WHERE p.idDocumento = ?
      ORDER BY p.dataPagamento DESC
    `).all(idDocumento);

    const lancamentos = db.prepare(`
      SELECT idLancamento, idDocumento, tipoLancamento, tituloLancamento, detalhes, valor, createdAt
      FROM lancamentos
      WHERE idDocumento = ?
      ORDER BY idLancamento ASC
    `).all(idDocumento);

    return { documento, cliente, arquivos, pagamentos, lancamentos };
  });

  // Atualizar apenas o status do documento
  ipcMain.handle('documentos:updateStatus', async (_event, { id, status }) => {
    const allowedStatuses = ['Pendente', 'Orçamento', 'Em Andamento', 'Concluído'];
    if (!allowedStatuses.includes(status)) {
      throw new Error('Status inválido.');
    }

    db.prepare(`
      UPDATE documentos
      SET statusDocumento = ?
      WHERE idDocumento = ?
    `).run(status, id);

    return { ok: true };
  });

  // Atualizar documento completo (nome, detalhes, cliente, status)
  ipcMain.handle('documentos:update', async (_event, payload) => {
    const { idDocumento, nomeDocumento, detalhes, idCliente, nomeCliente, statusDocumento } = payload;

    // Obter documento atual
    const documentoAtual = db.prepare(`
      SELECT d.idDocumento, d.idCliente, d.nomeDocumento, c.nome AS nomeCliente
      FROM documentos d
      JOIN clientes c ON c.idCliente = d.idCliente
      WHERE d.idDocumento = ?
    `).get(idDocumento);

    if (!documentoAtual) throw new Error('Documento não encontrado.');

    // Verifica cliente novo
    let clienteNovo = null;
    if (idCliente) {
      clienteNovo = db.prepare(`SELECT idCliente, nome FROM clientes WHERE idCliente = ?`).get(idCliente);
    } else if (nomeCliente) {
      clienteNovo = db.prepare(`SELECT idCliente, nome FROM clientes WHERE nome = ?`).get(nomeCliente);
      if (!clienteNovo) {
        const res = db.prepare(`INSERT INTO clientes (nome) VALUES (?)`).run(nomeCliente);
        clienteNovo = { idCliente: res.lastInsertRowid, nome: nomeCliente };
      }
    } else {
      clienteNovo = { idCliente: documentoAtual.idCliente, nome: documentoAtual.nomeCliente };
    }

    // Diretório padrão
    const row = db.prepare('SELECT caminho FROM diretorioPadrao WHERE id = 1').get();
    if (!row?.caminho) throw new Error('Diretório padrão não configurado.');
    const basePath = row.caminho;

    // Caminho antigo
    const nomeClienteAntigoSafe = gerarNomeSeguro(documentoAtual.nomeCliente);
    const pastaClienteAntiga = path.join(basePath, `${nomeClienteAntigoSafe}-${documentoAtual.idCliente}`);
    const pastaDocumentoAntiga = path.join(pastaClienteAntiga, gerarNomeSeguro(documentoAtual.nomeDocumento));

    // Caminho novo
    const nomeClienteNovoSafe = gerarNomeSeguro(clienteNovo.nome);
    const pastaClienteNova = path.join(basePath, `${nomeClienteNovoSafe}-${clienteNovo.idCliente}`);
    garantirDiretorio(pastaClienteNova);
    const pastaDocumentoNova = path.join(pastaClienteNova, gerarNomeSeguro(nomeDocumento || documentoAtual.nomeDocumento));
    garantirDiretorio(pastaDocumentoNova);

    // Move a pasta se necessário
    if (pastaDocumentoAntiga !== pastaDocumentoNova && fs.existsSync(pastaDocumentoAntiga)) {
      await fsp.cp(pastaDocumentoAntiga, pastaDocumentoNova, { recursive: true });
      // opcional: remover antiga depois de copiar
      // await fsp.rm(pastaDocumentoAntiga, { recursive: true, force: true });

      // Atualizar urls dos arquivos
      const arquivos = db.prepare(`SELECT idArquivo, nomeArquivo FROM arquivosDocumento WHERE idDocumento = ?`).all(idDocumento);
      const updateArquivo = db.prepare(`UPDATE arquivosDocumento SET urlArquivo = ? WHERE idArquivo = ?`);

      for (const arquivo of arquivos) {
        const novoCaminho = path.join(pastaDocumentoNova, arquivo.nomeArquivo);
        if (fs.existsSync(novoCaminho)) {
          updateArquivo.run(novoCaminho, arquivo.idArquivo);
        }
      }
    }

    // Atualizar registro do documento
    db.prepare(`
      UPDATE documentos
      SET idCliente = ?, nomeDocumento = ?, detalhes = ?, statusDocumento = ?
      WHERE idDocumento = ?
    `).run(
      clienteNovo.idCliente,
      nomeDocumento || documentoAtual.nomeDocumento,
      detalhes || null,
      statusDocumento || documentoAtual.statusDocumento,
      idDocumento,
    );

    return { ok: true };
  });

  function isSubPath(parent, child) {
    const rel = path.relative(parent, child);
    return rel && !rel.startsWith('..') && !path.isAbsolute(rel);
  }

  // Excluir documento (FS + DB)
  ipcMain.handle('documentos:delete', async (_event, idDocumento) => {
    idDocumento = Number(idDocumento);

    // 1) Descobrir baseDir e dados do documento/cliente
    const rowBase = db.prepare('SELECT caminho FROM diretorioPadrao WHERE id = 1').get();
    const baseDir = rowBase?.caminho || null;

    const doc = db.prepare(`
      SELECT d.idDocumento, d.nomeDocumento, d.idCliente, c.nome AS nomeCliente
      FROM documentos d
      JOIN clientes c ON c.idCliente = d.idCliente
      WHERE d.idDocumento = ?
    `).get(idDocumento);

    // 2) Coletar todos os caminhos de arquivo do doc
    const arquivos = db.prepare(`
      SELECT urlArquivo
      FROM arquivosDocumento
      WHERE idDocumento = ?
    `).all(idDocumento);

    // 3) Remover os arquivos individuais
    for (const a of arquivos) {
      const filePath = a?.urlArquivo;
      if (!filePath) continue;
      try {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch (e) {
        console.warn('[documentos:delete] falha ao remover arquivo:', filePath, e);
      }
    }

    // 4) Tentar remover as pastas do documento (com base nos pais dos arquivos)
    const docDirs = new Set(
      arquivos
        .map(a => a?.urlArquivo ? path.dirname(a.urlArquivo) : null)
        .filter(Boolean)
    );

    for (const dir of docDirs) {
      try {
        if (baseDir && isSubPath(baseDir, dir) && fs.existsSync(dir)) {
          await fsp.rm(dir, { recursive: true, force: true });
        }
      } catch (e) {
        console.warn('[documentos:delete] falha ao remover pasta do doc:', dir, e);
      }
    }

    // 5) Caso não haja arquivos no banco (ou pastas detectadas), tenta caminhos "esperados"
    if (baseDir && doc) {
      const clienteSafe = gerarNomeSeguro(doc.nomeCliente);
      const docSafe = gerarNomeSeguro(doc.nomeDocumento);

      // Suporta os dois padrões existentes no seu código (com e sem "-id")
      const candidateA = path.join(baseDir, `${clienteSafe}-${doc.idCliente}`, docSafe);
      const candidateB = path.join(baseDir, clienteSafe, docSafe);

      for (const cand of [candidateA, candidateB]) {
        try {
          if (isSubPath(baseDir, cand) && fs.existsSync(cand)) {
            await fsp.rm(cand, { recursive: true, force: true });
          }
        } catch (e) {
          console.warn('[documentos:delete] falha ao remover pasta esperada:', cand, e);
        }
      }
    }

    // 6) Por fim, limpar o banco
    const tx = db.transaction((id) => {
      db.prepare(`DELETE FROM arquivosDocumento WHERE idDocumento = ?`).run(id);
      db.prepare(`DELETE FROM lancamentos       WHERE idDocumento = ?`).run(id);
      db.prepare(`DELETE FROM documentos        WHERE idDocumento = ?`).run(id);
    });
    tx(idDocumento);

    return { ok: true };
  });

  // Lançamentos
  ipcMain.handle('documentos:addLancamento', async (_evt, payload) => {
    const stmt = db.prepare(`
      INSERT INTO lancamentos (idDocumento, tipoLancamento, tituloLancamento, detalhes, valor, createdAt)
      VALUES (?, ?, ?, ?, ?, COALESCE(?, strftime('%Y-%m-%dT%H:%M:%fZ','now')))
    `);
    const resultado = stmt.run(
      Number(payload.idDocumento),
      String(payload.tipoLancamento || 'servico'),
      payload.tituloLancamento || null,
      payload.detalhes || null,
      Number(payload.valor) || 0,
      payload.createdAt || null,
    );
    return { idLancamento: resultado.lastInsertRowid } 
  });

  ipcMain.handle('documentos:updateLancamento', async (_evt, payload) => {
    const {
      idLancamento,
      tituloLancamento,
      detalhes,
      valor
    } = payload;

    if (!idLancamento) {
      throw new Error('idLancamento é obrigatório.');
    }

    const lancamentoAtual = db.prepare(`
      SELECT idLancamento
      FROM lancamentos
      WHERE idLancamento = ?
    `).get(idLancamento);

    if (!lancamentoAtual) {
      throw new Error('Lançamento não encontrado.');
    }

    db.prepare(`
      UPDATE lancamentos
      SET tituloLancamento = ?,
          detalhes = ?,
          valor = ?
      WHERE idLancamento = ?
    `).run(
      tituloLancamento || null,
      detalhes || null,
      Number(valor) || 0,
      idLancamento
    );

    return { ok: true };
  });

  ipcMain.handle('documentos:deleteLancamento', async (_evt, idLancamento) => {
    db.prepare(`DELETE FROM lancamentos WHERE idLancamento = ?`).run(Number(idLancamento));
    return { ok: true };
  });

  ipcMain.handle('documentos:addArquivo', async (_evt, payload) => {
    const idDocumento = Number(payload?.idDocumento);
    const urlOrigem = String(payload?.urlArquivo || '').trim();
    const tipoArquivo = String(payload?.tipoArquivo || 'arquivo');
    const tituloArquivo = String(payload?.tituloArquivo || '').trim();

    if (!idDocumento || !urlOrigem) {
      throw new Error('ID do documento e URL do arquivo são obrigatórios.');
    }

    // obtem documento e cliente
    const doc = db.prepare(`
      SELECT d.idDocumento, d.nomeDocumento, c.idCliente, c.nome AS nomeCliente 
      FROM documentos d 
      JOIN clientes c ON c.idCliente = d.idCliente
      WHERE idDocumento = ?
    `).get(idDocumento);
    if(!doc) throw new Error('Documento não encontrado.');

    // monta pasta
    const row = db.prepare('SELECT caminho FROM diretorioPadrao WHERE id = 1').get();
    if (!row?.caminho) {
      throw new Error('Diretório padrão não está configurado.');
    }
    const base = row.caminho;

    const nomeClienteSeguro = gerarNomeSeguro(doc.nomeCliente);
    const nomeDocumentoSeguro = gerarNomeSeguro(doc.nomeDocumento);
    const caminhoPastaCliente = path.join(base, nomeClienteSeguro);
    const caminhoPastaDocumento = path.join(caminhoPastaCliente, nomeDocumentoSeguro);
    garantirDiretorio(caminhoPastaCliente);
    garantirDiretorio(caminhoPastaDocumento);
  
    // copia o arquivo
    const nomeOrigem = path.basename(urlOrigem);
    let destino = path.join(caminhoPastaDocumento, nomeOrigem);
    if (fs.existsSync(destino)) {
      destino = path.join(caminhoPastaDocumento, `doc-${idDocumento}-${nomeOrigem}`);
    }
    fs.copyFileSync(urlOrigem, destino);

    // insere no banco 
    const ext = path.extname(urlOrigem);
    const nomeDesejado = (tituloArquivo || '').trim();
    const nomeBanco = ensureExt(nomeDesejado || path.basename(destino), ext);
    const stmt = db.prepare(`
      INSERT INTO arquivosDocumento (idDocumento, urlArquivo, tipoArquivo, nomeArquivo)
      VALUES (?, ?, ?, ?)
    `);
    const resultado = stmt.run(
      idDocumento,
      destino,
      tipoArquivo,
      nomeBanco,
    );

    return {
      idArquivo: resultado.lastInsertRowid,
      idDocumento,
      urlArquivo: destino,
      tipoArquivo,
      nomeArquivo: nomeBanco,
      tituloArquivo: nomeBanco,
    };
  });

  ipcMain.handle('documentos:removeArquivo', async (_evt, arg) => {
    const payload = typeof arg === 'number' ? { idArquivo: arg } : (arg || {});
    const idArquivo = Number(payload.idArquivo || 0);
    const removePhysical = payload.removePhysical !== false; // default: true

    if (!idArquivo) throw new Error('idArquivo obrigatório.');

    const row = db.prepare(`
      SELECT idArquivo, idDocumento, urlArquivo
      FROM arquivosDocumento
      WHERE idArquivo = ?
    `).get(idArquivo);

    if (!row) throw new Error('Arquivo não encontrado.');

    const del = db.prepare(`DELETE FROM arquivosDocumento WHERE idArquivo = ?`).run(idArquivo);

    if (removePhysical && row.urlArquivo) {
      try {
        if (fs.existsSync(row.urlArquivo)) fs.unlinkSync(row.urlArquivo);
      } catch (e) {
        console.warn('[documentos:removeArquivo] falha ao remover arquivo físico:', e);
      }
    }

    return { ok: true, deleted: del.changes, idArquivo, urlArquivo: row.urlArquivo };
  });
};
