//Ponte segura para a conexão entre o main e o renderer

const{ contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    //Aqui fica os arquivos IPCs que realizaram a conexão segura
    clientes: {
        //funções que serão responsáveis pelos dados
        list: () => ipcRenderer.invoke('clientes:list'),
        create: (data) => ipcRenderer.invoke('clientes:create', data),
    },

    //os outros ipcs irão aqui...
})