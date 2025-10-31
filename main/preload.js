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
        deleteLancamento: (id) => ipcRenderer.invoke('documentos:deleteLancamento', id),
        addArquivo: (payload) => ipcRenderer.invoke('documentos:addArquivo', payload),
        removeArquivo: (args) => ipcRenderer.invoke('documentos:removeArquivo', args),
    },
    listDocumentos: {
        list: (opts) => ipcRenderer.invoke('listDocumentos:list', opts),
    },
    //os outros ipcs irão aqui...
})
