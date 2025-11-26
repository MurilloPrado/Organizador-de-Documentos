# Organizador-de-Documentos

## 📄 Sobre  
O **Organizador-de-Documentos** é uma ferramenta desktop desenvolvida em Electorn para — organizar, categorizar, gerenciar documentos e controle financeiro simples. Ajuda a estruturar e padronizar procedimento para o tratamento dos documentos, além de facilitar a busca/armazenamento e manutenção de um acervo organizado.  

## Funcionalidades principais  
- Organiza documentos.  
- Permite fácil navegação e busca entre documentos.  
- Interface simples para facilitar uso.  
- Acompanhamento financeiro com gráficos e histórico
- Cadastro de clientes 
- Atualizações automáticas do aplicativo.

## 🛠️ Tecnologias / Stack  
- JavaScript
- HTML
- CSS :contentReference[oaicite:0]{index=0}  
**Runtime:**
- **better-sqlite3** – Banco de dados local SQLite.
- **electron-log** – Sistema de logs internos.
- **electron-updater** – Atualizações automáticas do app.

**Desenvolvimento:**
- **electron** – Framework principal do aplicativo desktop.
- **electron-builder** – Build e geração dos instaladores.

## Como Usar/Instalar
### 1. Baixar pela Release (Método recomendado)
Você pode usar o aplicativo sem precisar instalar nada de desenvolvimento.

1. Acesse:  
   **https://github.com/MurilloPrado/Organizador-de-Documentos/releases**
2. Baixe a última versão disponível para o seu sistema operacional (Windows, macOS ou Linux).
3. Execute o instalador.
4. Abra o aplicativo normalmente.

As atualizações futuras serão baixadas automaticamente pelo próprio app.

### 2. Rodar pelo código fonte (opcional)
Se preferir iniciar via Node/Electron:

```bash
git clone https://github.com/MurilloPrado/Organizador-de-Documentos.git
cd Organizador-de-Documentos
npm install
npm start
```

## Estrutura do Projeto
```bash
/renderer/           # Interface, telas e renderização
/main/               # Processos principais do Electron (main process)
/testes/             # Testes (se aplicável)
main.js              # Entry point da aplicação Electron
package.json         # Configurações, scripts e dependências
```