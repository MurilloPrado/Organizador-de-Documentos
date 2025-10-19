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

contextBridge.exposeInMainWorld('api', {
    //Aqui fica os arquivos IPCs que realizaram a conexão segura
    clientes: {
        //funções que serão responsáveis pelos dados
        list: () => ipcRenderer.invoke('clientes:list'),
        create: (data) => ipcRenderer.invoke('clientes:create', data),
        searchPrefix: (prefix) => ipcRenderer.invoke('clientes:searchPrefix', prefix),
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
        deleteLancamento: (id) => ipcRenderer.invoke('documentos:deleteLancamento', id),
        addArquivo: (payload) => ipcRenderer.invoke('documentos:addArquivo', payload),
        removeArquivo: (args) => ipcRenderer.invoke('documentos:removeArquivo', args),
    },
    listDocumentos: {
        list: (opts) => ipcRenderer.invoke('listDocumentos:list', opts),
    },
    //os outros ipcs irão aqui...
})
