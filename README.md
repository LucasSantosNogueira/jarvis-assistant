# JARVIS — Local Personal Assistant in Node.js

Personal assistant developed in **Node.js (ES Modules)** to centralize academic and professional routine information, integrate external APIs, perform web searches, and generate strategic career and productivity analyses.

## Features

- **Integration with Google Workspace (`googleapis`):** Checks unread emails in Gmail and today's appointments in Google Calendar via OAuth2.
- **Event Radar in Rio de Janeiro (`duck-duck-scrape`):** Searches for events, lectures, and initiatives related to Chemical Engineering, energy, research, and technology.
- **Weather Monitoring:** Checks current temperature and rain conditions in Rio de Janeiro via Open-Meteo.
- **Profile and Strategy Analysis:** Reads structured local profile/metrics data to support technical content planning and professional positioning.
- **AI Router with Local Fallback:** Attempts to use models via Groq or Gemini and, in the absence of a key/quota, runs a deterministic local analysis engine.
- **Voice Synthesis (Optional):** Generates audio in `pt-BR` via an auxiliary Python script (`edge-tts` and `playsound`).

## Project Structure

```text
├── src/
│   ├── index.js          # Main orchestrator, interactive CLI, analyses, and voice
│   └── jarvis-google.js  # OAuth2 authentication flow and Gmail/Calendar test
├── .env.example          # Environment variables template
├── .gitignore            # Files and folders ignored by Git
├── package.json          # NPM dependencies and scripts
└── README.md
```

## Setup and Execution

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   Copy `.env.example` to `.env` and fill in your keys (if using external AI):
   ```bash
   cp .env.example .env
   ```

3. **Google Credentials (optional for Gmail/Calendar):**
   Place your `credentials.json` (generated in the Google Cloud Console) in the project root. On the first authentication run, `token.json` will be generated locally (both are already in `.gitignore`).

4. **Run the assistant:**
   ```bash
   npm start
   ```
   For development mode with watch:
   ```bash
   npm run dev
   ```

## Security and Privacy

Sensitive files and personal data (`node_modules/`, `.env`, `credentials.json`, `token.json`, and `linkedin_perfil.json`) are kept out of version control via `.gitignore`.
