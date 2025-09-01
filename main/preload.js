//Ponte segura para a conexão entre o main e o renderer

const{ contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    //Aqui fica os arquivos IPCs que realizaram a conexão segura
    clientes: {
        //funções que serão responsáveis pelos dados
        list: () => ipcRenderer.invoke('clientes:list'),
        create: (data) => ipcRenderer.invoke('clientes:create', data),
    },
    settings: {
        chooseDirectory: () => ipcRenderer.invoke('settings:chooseDirectory'),
        setDirectory: (path) => ipcRenderer.invoke('settings:setDirectory', path),
        getDirectory: () => ipcRenderer.invoke('settings:getDirectory'),
    },
    documentos: {
        create: (payload) => ipcRenderer.invoke('documentos:create', payload),
    }
    //os outros ipcs irão aqui...
})