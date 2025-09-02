import { guessMimeFromName } from "./mime.js"; 

// Converte um File ou Blob em um objeto adequado para envio ao backend
export const fileToRecord = f => ({
    urlArquivo: f.path??'',
    tipoArquivo: f.type||guessMimeFromName(f.name),
    nomeArquivo: f.name,
});