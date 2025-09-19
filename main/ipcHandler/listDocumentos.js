module.exports = (ipcMain, db) =>{
    ipcMain.handle('listDocumentos:list', async (_evt, opts = {}) => {
        const { query = '', status = 'recentes', limit = 100, offset = 0 } = opts;

        // Valida status
        const allowed = new Set(['Pendente', 'Em Andamento', 'Concluído']);
        const q = String(query || '').trim();

        let sql = `
            SELECT d.idDocumento, d.nomeDocumento, d.statusDocumento, d.dataCriado, c.nome AS nomeCliente
            FROM documentos d
            JOIN clientes c ON d.idCliente = c.idCliente
            WHERE 1=1
        `;
        const params = [];

        // status pode ser array (checkboxes) ou vazio (= recentes)
        const valid = Array.isArray(status) ? status.filter(s => allowed.has(s)) : [];
        if (valid.length > 0) {
            sql += ` AND d.statusDocumento IN (${valid.map(() => '?').join(',')}) `;
            params.push(...valid);
        }

        if (q) {
            sql += ` AND (d.nomeDocumento LIKE ? COLLATE NOCASE OR c.nome LIKE ? COLLATE NOCASE) `;
            params.push(`%${q}%`, `%${q}%`);
        }

        sql += ` ORDER BY datetime(d.dataCriado) DESC, d.idDocumento DESC LIMIT ? OFFSET ? `;
        params.push(Number(limit)||100, Number(offset)||0);

        return db.prepare(sql).all(...params);
        });
}