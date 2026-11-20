# JARVIS — Assistente Pessoal Local em Node.js

Assistente pessoal desenvolvido em **Node.js (ES Modules)** para centralizar informações da rotina acadêmica e profissional, integrar APIs externas, realizar buscas na web e gerar análises estratégicas de carreira e produtividade.

## Funcionalidades

* **Integração com Google Workspace (`googleapis`):** Consulta e-mails não lidos no Gmail e compromissos do dia no Google Calendar via OAuth2.
* **Radar de Eventos no Rio de Janeiro (`duck-duck-scrape`):** Busca eventos, palestras e iniciativas ligadas a Engenharia Química, energia, pesquisa e tecnologia.
* **Monitoramento Meteorológico:** Consulta condições atuais de temperatura e chuva no Rio de Janeiro via Open-Meteo.
* **Análise de Perfil e Estratégia:** Lê dados estruturados de perfil/métricas locais para apoiar planejamento de conteúdo técnico e posicionamento profissional.
* **Roteador de IA com Fallback Local:** Tenta utilizar modelos via Groq ou Gemini e, na ausência de chave/cota, executa um motor de análise local determinístico.
* **Síntese de Voz (Opcional):** Gera áudio em `pt-BR` via script auxiliar em Python (`edge-tts` e `playsound`).

## Estrutura do Projeto

```text
├── src/
│   ├── index.js          # Orquestrador principal, CLI interativa, análises e voz
│   └── jarvis-google.js  # Fluxo de autenticação OAuth2 e teste Gmail/Calendar
├── .env.example          # Modelo de variáveis de ambiente
├── .gitignore            # Arquivos e pastas ignorados pelo Git
├── package.json          # Dependências e scripts NPM
└── README.md
```

## Configuração e Execução

1. **Instale as dependências:**
   ```bash
   npm install
   ```

2. **Configure as variáveis de ambiente:**
   Copie `.env.example` para `.env` e preencha suas chaves (se for usar IA externa):
   ```bash
   cp .env.example .env
   ```

3. **Credenciais do Google (opcional para Gmail/Calendar):**
   Coloque seu `credentials.json` (gerado no Google Cloud Console) na raiz do projeto. Na primeira execução de autenticação, o `token.json` será gerado localmente (ambos já estão no `.gitignore`).

4. **Execute o assistente:**
   ```bash
   npm start
   ```
   Para modo de desenvolvimento com watch:
   ```bash
   npm run dev
   ```

## Segurança e Privacidade

Arquivos sensíveis e dados pessoais (`node_modules/`, `.env`, `credentials.json`, `token.json` e `linkedin_perfil.json`) são mantidos fora do controle de versão por meio do `.gitignore`.