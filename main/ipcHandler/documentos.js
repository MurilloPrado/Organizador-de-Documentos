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
        .normalize('NFD')                   // Normaliza caracteres Unicode
        .replace(/[\u0300-\u036f]/g, '')   // Remove acentuação
        .replace(/[^a-z0-9]+/g, '-')       // Substitui caracteres inválidos por hífen
        .replace(/^-+|-+$/g, '')           // Remove hífens do início e fim
        .replace(/\s+/g, '-')         // Substitui espaços por hífen
        .trim();                           // Remove espaços em branco do início e fim
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

        if(Number.isInteger(payload?.idCliente)) {
            registroCliente = db .prepare('SELECT idCliente AS id, nome FROM clientes WHERE idCliente = ?').get(payload.idCliente);
        }

        if (!registroCliente){
            const nomeCliente = String(payload?.nomeCliente || '').trim();
            if (!nomeCliente) {
                throw new Error('Nome do cliente é obrigatório quando ID do cliente não é fornecido.');
            }
            registroCliente = db.prepare('SELECT idCliente AS id, nome FROM clientes WHERE nome = ?').get(nomeCliente);

            if (!registroCliente) {
                const resultadoCliente = db .prepare('INSERT INTO clientes (nome) VALUES (?)').run(nomeCliente);
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
                    INSERT INTO lancamentos (idDocumento, tipoLancamento, detalhes, valor, tituloLancamento)
                    VALUES (?, ?, ?, ?, ?)
                `);

                for (const item of payload.lancamentos) {
                    inserirLancamento.run(
                        idDocumento,
                        item.tipoLancamento,
                        item.detalhes || null,
                        Number(item.valor) || 0,
                        item.tituloLancamento || null
                    );
                };
            }

            if (Array.isArray(payload.arquivos)) {
                const inserirArquivo = db.prepare(`
                    INSERT INTO arquivosDocumento (idDocumento, urlArquivo, tipoArquivo, nomeArquivo)
                    VALUES (?, ?, ?, ?)
                `);

                for (const arquivo of payload.arquivos) {
                    const origem = String(arquivo.urlArquivo || '').trim();
                    if(!origem) continue;

                    const nomeArquivo = path.basename(origem);

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

}
