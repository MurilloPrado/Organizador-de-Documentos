//Ponte segura para a conexão entre o main e o renderer

const{ contextBridge, shell, ipcRenderer } = require('electron');
const{ pathToFileURL } = require('node:url');

contextBridge.exposeInMainWorld('electron', {
    openExternal: (raw) => {
        if(!raw) return;

        const url = pathToFileURL(raw).href;
        return shell.openExternal(url);
    }
});

contextBridge.exposeInMainWorld('files', {
    choose: (options) => ipcRenderer.invoke('files:choose', options || {}),
    exists: (absPath) => ipcRenderer.invoke('files:exists', absPath),
    openPath: (absPath) => ipcRenderer.invoke('files:openPath', absPath),
})

contextBridge.exposeInMainWorld('electronAPI', {
    onUpdateStatus: (callback) => {
        ipcRenderer.on('update-status', (_event, data) => callback(data));
    },
    confirm: (arg) => { if (typeof arg === 'string') {
        return ipcRenderer.invoke('showConfirm', {
            message: arg,
            single: false
        });
    }

  // novo formato
  return ipcRenderer.invoke('showConfirm', arg);
}
});

contextBridge.exposeInMainWorld('api', {
    //Aqui fica os arquivos IPCs que realizaram a conexão segura
    clientes: {
        //funções que serão responsáveis pelos dados
        list: (opts) => ipcRenderer.invoke('clientes:list', opts),
        create: (payload) => ipcRenderer.invoke('clientes:create', payload),
        searchPrefix: (prefix) => ipcRenderer.invoke('clientes:searchPrefix', prefix),
        getById:     (id)=> ipcRenderer.invoke('clientes:getById', id),
        update:      (p) => ipcRenderer.invoke('clientes:update', p),
        delete:      (id)=> ipcRenderer.invoke('clientes:delete', id),
    },
    settings: {
        chooseDirectory: () => ipcRenderer.invoke('settings:chooseDirectory'),
        setDirectory: (path) => ipcRenderer.invoke('settings:setDirectory', path),
        getDirectory: () => ipcRenderer.invoke('settings:getDirectory'),
    },
    documentos: {
        create: (payload) => ipcRenderer.invoke('documentos:create', payload),
        getUltimoId: () => ipcRenderer.invoke('documentos:getUltimoId'),
        getById: (id) => ipcRenderer.invoke('documentos:getById', id),
        updateStatus: ({ id, status }) => ipcRenderer.invoke('documentos:updateStatus', { id, status }),
        update: (payload) => ipcRenderer.invoke('documentos:update', payload),
        delete: (id) => ipcRenderer.invoke('documentos:delete', id),
        addLancamento: (payload) => ipcRenderer.invoke('documentos:addLancamento', payload),
        updateLancamento: (payload) => ipcRenderer.invoke('documentos:updateLancamento', payload),
        deleteLancamento: (id) => ipcRenderer.invoke('documentos:deleteLancamento', id),
        addArquivo: (payload) => ipcRenderer.invoke('documentos:addArquivo', payload),
        removeArquivo: (args) => ipcRenderer.invoke('documentos:removeArquivo', args),
    },
    listDocumentos: {
        list: (opts) => ipcRenderer.invoke('listDocumentos:list', opts),
    },
    financeiro: {
        getById: ({ id, tipo }) => ipcRenderer.invoke('financeiro:getById', { id, tipo }),
        list: () => ipcRenderer.invoke('financeiro:list'),
        create: (payload) => ipcRenderer.invoke('financeiro:create', payload),
        update: (payload) => ipcRenderer.invoke('financeiro:update', payload),
        delete: ({ id, tipo }) => ipcRenderer.invoke('financeiro:delete', { id, tipo }),
        listDocumentosByCliente: (nomeCliente) => ipcRenderer.invoke('financeiro:listDocumentosByCliente', nomeCliente),
        getClienteByDocumento: (idDocumento) => ipcRenderer.invoke('financeiro:getClienteByDocumento', idDocumento),
        searchDocumentos: (query) => ipcRenderer.invoke('financeiro:searchDocumentos', query),
    },
    dashboard: {
        getOverview: (filter) => ipcRenderer.invoke('dashboard:getOverview', filter),
        getGanhosCustos: (filter) => ipcRenderer.invoke('dashboard:getGanhosCustos', filter),
        getDistribuicaoCustos: (filter) => ipcRenderer.invoke('dashboard:getDistribuicaoCustos', filter),
        getEvolucao: (filter) => ipcRenderer.invoke('dashboard:getEvolucao', filter),
        getSaldo: (filter) => ipcRenderer.invoke('dashboard:getSaldo', filter),
        getTopCustos: (filter) => ipcRenderer.invoke('dashboard:getTopCustos', filter),
    },
    //os outros ipcs irão aqui...
})
