# JARVIS — Local Personal Assistant in Node.js

Personal assistant built in Node.js (ES Modules) to centralize daily academic and engineering workflows, integrate external APIs, perform web searches, and generate strategic career and productivity insights.

## Features
- **Google Workspace Integration (`googleapis`):** Queries unread Gmail messages and daily Google Calendar events via OAuth2.
- **Rio de Janeiro Event Radar (`duck-duck-scrape`):** Searches for events, talks, and initiatives related to Chemical Engineering, energy, research, and technology.
- **Weather Monitoring:** Checks current temperature and rain conditions in Rio de Janeiro via Open-Meteo.
- **Profile & Strategy Analysis:** Reads structured local profile/metrics data to support technical content planning and professional positioning.
- **AI Router with Local Fallback:** Attempts to use Groq or Gemini models and falls back to a deterministic local analysis engine when API keys or quotas are unavailable.
- **Voice Synthesis (Optional):** Generates `pt-BR` audio via a helper Python script (`edge-tts` and `playsound`).

## Project Structure
├── src/
│   ├── index.js          # Main orchestrator, interactive CLI, analysis, and voice
│   └── jarvis-google.js  # OAuth2 authentication flow and Gmail/Calendar test
├── .env.example          # Environment variables template
├── .gitignore            # Files and folders ignored by Git
├── package.json          # Dependencies and NPM scripts
└── README.md

## Setup & Execution
1. Install dependencies:
   ```bash
   npm installls.json`, `token.json` e `linkedin_perfil.json`) são mantidos fora do controle de versão por meio do `.gitignore`.
