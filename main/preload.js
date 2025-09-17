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
    }
    //os outros ipcs irão aqui...
})
