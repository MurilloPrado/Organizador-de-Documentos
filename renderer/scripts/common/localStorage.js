// Faz as operações básicas com arrays no localStorage

// Cada array é salvo em uma chave específica
export const KEY = { servicos:'app.servicos', taxas:'app.taxas', certidoes:'app.certidoes', despesas: 'app.despesas', arquivos: 'app.arquivos' };

// Retorna o array salvo na chave k ou um array vazio
export const getArray = k =>{
    try {
        return JSON.parse(localStorage.getItem(k)) || [];
    } catch{
        return [];
    }
};

// Salva o array a na chave k
export const setArray = (k, a) => localStorage.setItem(k, JSON.stringify(a || []));

// Adiciona o valor v ao array salvo na chave k e retorna o array atualizado
export const pushArray = (k, v) => {
    const a = getArray(k);
    a.push(v);
    setArray(k, a);
    return a;
};

// Remove o elemento na posição r do array salvo na chave k e retorna o array atualizado
export const removeArray = (k, r) => {
    const a = getArray(k);
    a.splice(r, 1);
    setArray(k, a);
    return a;
};

// Limpa todas as chaves usadas
export const clear = () => Object.values(KEY).forEach(k => localStorage.removeItem(k));