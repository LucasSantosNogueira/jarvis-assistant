import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';
import { google } from 'googleapis';
import { search, SafeSearchType } from 'duck-duck-scrape';
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { exec } from 'child_process';

const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Voz Neural (Antônio)
function falarJarvis(texto) {
  return new Promise((resolve) => {
    const textoLimpo = texto
      .replace(/[*#_`~-]/g, '')
      .replace(/\n/g, '. ')
      .replace(/"/g, "'");

    const audioPath = path.join(process.cwd(), 'jarvis_voz.mp3');
    const voz = 'pt-BR-AntonioNeural';
    
    const scriptPython = `
import asyncio
import edge_tts
from playsound import playsound
import os

async def main():
    try:
        communicate = edge_tts.Communicate("${textoLimpo}", "${voz}")
        await communicate.save(r"${audioPath}")
        playsound(r"${audioPath}")
    except Exception as e:
        pass
    finally:
        if os.path.exists(r"${audioPath}"):
            try:
                os.remove(r"${audioPath}")
            except:
                pass

asyncio.run(main())
    `;

    const tempScriptPath = path.join(process.cwd(), 'temp_speak.py');
    fs.writeFileSync(tempScriptPath, scriptPython, 'utf8');

    exec(`python "${tempScriptPath}"`, (error) => {
      if (error) {
        exec(`py "${tempScriptPath}"`, () => {
          if (fs.existsSync(tempScriptPath)) try { fs.unlinkSync(tempScriptPath); } catch (e) {}
          resolve();
        });
      } else {
        if (fs.existsSync(tempScriptPath)) try { fs.unlinkSync(tempScriptPath); } catch (e) {}
        resolve();
      }
    });
  });
}

async function getGoogleAuth() {
  const content = fs.readFileSync(CREDENTIALS_PATH);
  const credentials = JSON.parse(content);
  const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
  const token = fs.readFileSync(TOKEN_PATH);
  oAuth2Client.setCredentials(JSON.parse(token));
  return oAuth2Client;
}

// 1. Gmail
async function verificarEmails() {
  try {
    const auth = await getGoogleAuth();
    const gmail = google.gmail({ version: 'v1', auth });
    const res = await gmail.users.messages.list({
      userId: 'me',
      q: 'is:unread in:inbox',
      maxResults: 5,
    });

    const messages = res.data.messages;
    if (!messages || messages.length === 0) return 'Nenhum e-mail não lido.';

    let resumo = 'E-mails não lidos: ';
    for (const message of messages) {
      const msg = await gmail.users.messages.get({ userId: 'me', id: message.id });
      const subject = msg.data.payload.headers.find(h => h.name === 'Subject')?.value || 'Sem assunto';
      const sender = msg.data.payload.headers.find(h => h.name === 'From')?.value || 'Desconhecido';
      resumo += `De ${sender}, assunto: ${subject}. `;
    }
    return resumo;
  } catch (error) {
    return 'Gmail indisponível no momento.';
  }
}

// 2. Agenda
async function verificarAgenda() {
  try {
    const auth = await getGoogleAuth();
    const calendar = google.calendar({ version: 'v3', auth });
    const now = new Date();
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const res = await calendar.events.list({
      calendarId: 'primary',
      timeMin: now.toISOString(),
      timeMax: endOfDay.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = res.data.items;
    if (!events || events.length === 0) return 'Nenhum compromisso agendado para hoje.';

    let resumo = 'Compromissos de hoje: ';
    events.forEach((event) => {
      const start = event.start.dateTime || event.start.date;
      resumo += `${event.summary} às ${new Date(start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}. `;
    });
    return resumo;
  } catch (error) {
    return 'Google Calendar indisponível no momento.';
  }
}

// 3. Clima RJ
async function verificarClimaRio() {
  try {
    const url = 'https://api.open-meteo.com/v1/forecast?latitude=-22.9068&longitude=-43.1729&current=temperature_2m,precipitation,rain&timezone=America%2FSao_Paulo';
    const response = await fetch(url);
    const data = await response.json();
    
    if (data && data.current) {
      const temp = data.current.temperature_2m;
      const chuva = data.current.precipitation;
      const descChuva = chuva > 0 ? `Há previsão de chuva (${chuva} mm).` : 'Sem probabilidade de chuva no momento.';
      return `Temperatura atual no Rio de Janeiro de ${temp} graus Celsius. ${descChuva}`;
    }
    return 'Dados meteorológicos indisponíveis.';
  } catch (error) {
    return 'Erro ao consultar o clima.';
  }
}

// 4. Ler Perfil do LinkedIn
function lerPerfilLinkedIn() {
  const pathsToTry = [
    path.join(process.cwd(), 'linkedin_perfil.json'),
    path.join(process.cwd(), 'src', 'linkedin_perfil.json')
  ];
  
  for (const filePath of pathsToTry) {
    if (fs.existsSync(filePath)) {
      try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
      } catch (e) {}
    }
  }
  return null;
}

// 5. Buscar Eventos em Todo o Rio de Janeiro (Sympla, CREA-RJ, IBP, UFRJ, Petrobras)
async function buscarEventosEngQuimicaRJ() {
  try {
    const queries = [
      'eventos engenharia quimica tecnologia rio de janeiro sympla 2026',
      'palestras cursos engenharia energia rio de janeiro crea rj ibp 2026',
      'eventos ufrj petrobras int engenharia quimica rio de janeiro 2026'
    ];
    let listaEventos = [];
    for (const q of queries) {
      const res = await search(q, { safeSearch: SafeSearchType.MODERATE });
      if (res && res.results) {
        res.results.slice(0, 3).forEach(item => {
          listaEventos.push({
            titulo: item.title,
            descricao: item.description,
            url: item.url
          });
        });
      }
      await sleep(500);
    }
    return listaEventos;
  } catch (error) {
    return [];
  }
}

// 6. Raciocínio Autônomo Local (Cruza métricas, experiências atuais e histórico real de posts)
function gerarAnaliseLocalInteligente(emails, agenda, clima, perfil, eventosArr) {
  let texto = `Relatório Executivo dos Sistemas.\n\n`;
  texto += `• E-mails e Agenda: ${emails} ${agenda}\n`;
  texto += `• Clima no Rio: ${clima}\n\n`;

  if (perfil) {
    texto += `=== ANÁLISE ESTRATÉGICA DO SEU LINKEDIN ===\n`;
    const m = perfil.metricas_atuais || {};
    const exps = perfil.experiencias || [];
    const posts = perfil.historico_posts || [];
    const certs = perfil.certificados_cadastrados || [];

    // 1. Leitura de tração e consistência recente
    if (posts.length > 0) {
      const ultimo = posts[0];
      texto += `1. Tração Recente: Ótimo ritmo com ${m.posts_esta_semana || 0} post(s) e ${m.comentarios_esta_semana || 0} comentários esta semana (${m.impressoes_posts_7_dias || 0} impressões). Seu último post ("${ultimo.titulo}") teve ótimo engajamento relativo (${ultimo.reacoes} reações para ${ultimo.impressoes} impressões).\n`;
    }

    // 2. Cruzamento: Experiências atuais que ainda NÃO viraram post
    const titulosPostados = posts.map(p => p.titulo.toLowerCase()).join(' ');
    const expsIneditas = exps.filter(exp => {
      const termos = (exp.cargo + ' ' + (exp.foco || '')).toLowerCase();
      if (termos.includes('ccs') && !titulosPostados.includes('ccs') && !titulosPostados.includes('carbono')) return true;
      if (termos.includes('cheme sports') && !titulosPostados.includes('cheme sports')) return true;
      if (termos.includes('power bi') && !titulosPostados.includes('power bi')) return true;
      return false;
    });

    if (expsIneditas.length > 0) {
      const escolhida = expsIneditas[Math.floor(Math.random() * expsIneditas.length)];
      texto += `2. Pauta Inédita Detectada: Você já atua como "${escolhida.cargo}" (${escolhida.organizacao}), mas ainda não publicou nenhum case sobre isso. Sugestão para o próximo post: mostre um bastidor técnico sobre ${escolhida.foco}\n`;
    } else if (certs.length > 0) {
      const cert = certs[Math.floor(Math.random() * certs.length)];
      texto += `2. Ideia de Post Prático: Aproveite sua certificação "${cert}" e publique uma aplicação direta dela em problemas de Engenharia Química.\n`;
    }

    // 3. Análise de alcance e conversão de buscas
    if ((m.aparicoes_pesquisa_semanal || 0) < 20) {
      texto += `3. Visibilidade em Buscas: Você teve ${m.aparicoes_pesquisa_semanal || 0} aparições em pesquisas esta semana. Sua headline nova está bem posicionada; agora adicione o link do seu GitHub na seção "Em Destaque" (Featured) do perfil para converter as ${m.visualizacoes_perfil_90_dias || 0} visitas em conexões de recrutadores.\n\n`;
    }
  } else {
    texto += `• LinkedIn: Arquivo linkedin_perfil.json não encontrado na raiz do projeto.\n\n`;
  }

  texto += `=== EVENTOS DE ENGENHARIA E TECNOLOGIA NO RIO DE JANEIRO ===\n`;
  if (eventosArr && eventosArr.length > 0) {
    eventosArr.slice(0, 4).forEach((ev) => {
      texto += `- Dia a confirmar (consulte o link), evento ${ev.titulo} no Rio de Janeiro sobre ${ev.descricao}, inscrições abertas ou gratuitas.\n`;
    });
  } else {
    texto += `Sem simpósios ou palestras específicas com inscrições abertas na varredura ampla de hoje em todo o Rio de Janeiro (Sympla, CREA-RJ, IBP, UFRJ e Petrobras).\n`;
  }

  return texto;
}

// Descobre automaticamente qual modelo está ativo na conta Groq do usuário
async function obterModeloAtivoGroq(groqKey) {
  try {
    const res = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { 'Authorization': `Bearer ${groqKey}` }
    });
    const data = await res.json();
    if (data && Array.isArray(data.data)) {
      const modelosTexto = data.data
        .map(m => m.id)
        .filter(id => !id.includes('whisper') && !id.includes('guard') && !id.includes('vision'));
      
      return modelosTexto.find(id => id.includes('70b')) 
          || modelosTexto.find(id => id.includes('8b')) 
          || modelosTexto[0];
    }
  } catch (e) {}
  return null;
}

// Roteador de IA (Groq Dinâmico -> Gemini -> Raciocínio Cruzado Local)
async function chamarIA(promptFinal, emails, agenda, clima, perfilObj, eventosArr) {
  const rawKey = process.env.GROQ_API_KEY;
  const groqKey = rawKey ? rawKey.replace(/["']/g, "").trim() : "";

  if (groqKey) {
    const modeloGroq = await obterModeloAtivoGroq(groqKey);
    if (modeloGroq) {
      try {
        console.log(`[JARVIS] Pensando com IA Groq (${modeloGroq})...`);
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${groqKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: modeloGroq,
            messages: [{ role: 'user', content: promptFinal }],
            temperature: 0.7
          })
        });
        const data = await res.json();
        if (data.choices && data.choices[0]?.message?.content) {
          return data.choices[0].message.content;
        }
      } catch (e) {}
    }
  }

  // Fallback Gemini
  const geminiKeys = [process.env.GEMINI_API_KEY_1, process.env.GEMINI_API_KEY_2].filter(Boolean);
  for (const rawG of geminiKeys) {
    try {
      console.log('[JARVIS] Pensando com IA Gemini...');
      const ai = new GoogleGenAI({ apiKey: rawG.replace(/["']/g, "").trim() });
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: promptFinal,
      });
      if (response && response.text) return response.text;
    } catch (e) {}
  }

  console.log('[JARVIS] APIs externas sem cota no momento. Executando motor de raciocínio cruzado local...');
  return gerarAnaliseLocalInteligente(emails, agenda, clima, perfilObj, eventosArr);
}

// Orquestrador Principal
async function generateWithJarvis(promptUsuario) {
  const lower = promptUsuario.toLowerCase();
  const dataHoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  
  console.log('[JARVIS] Consultando Gmail e Agenda...');
  const emails = await verificarEmails();
  const agenda = await verificarAgenda();
  
  console.log('[JARVIS] Consultando Clima no RJ...');
  const clima = await verificarClimaRio();

  console.log('[JARVIS] Lendo dados brutos do LinkedIn...');
  const perfilObj = lerPerfilLinkedIn();
  const perfilLinkedIn = perfilObj ? JSON.stringify(perfilObj, null, 2) : 'Perfil não encontrado.';

  let eventosArr = [];
  if (lower.includes('tudo') || lower.includes('hoje') || lower.includes('evento') || lower.includes('palestra') || lower.includes('noticia')) {
    console.log('[JARVIS] Varrendo eventos no Rio de Janeiro...');
    eventosArr = await buscarEventosEngQuimicaRJ();
  }

  const eventosTextoWeb = eventosArr.map(e => `- ${e.titulo}: ${e.descricao}`).join('\n');

  const promptFinal = `
Você é o JARVIS, estrategista de carreira e assistente executivo do Lucas Santos Nogueira. Responda em português do Brasil, de forma direta e natural para voz.
Data de hoje: ${dataHoje}.

[Gmail]: ${emails}
[Agenda]: ${agenda}
[Clima RJ]: ${clima}
[Dados Brutos do LinkedIn do Lucas]: ${perfilLinkedIn}
[Eventos Web RJ]: ${eventosTextoWeb}

TAREFA OBRIGATÓRIA:
1. Resuma brevemente os e-mails importantes, agenda e clima.
2. LINKEDIN (RACIOCÍNIO ORIGINAL): Analise os dados brutos do JSON do LinkedIn acima. NÃO apenas repita o que está escrito lá! Pense como um recrutador sênior de Engenharia Química e Dados:
   - Compare as experiências atuais e certificados com os posts já publicados e sugira uma ideia INÉDITA de post técnico (dando até uma sugestão de gancho/título).
   - Proponha uma melhoria concreta na headline, no "Sobre" ou nas competências com base no que está faltando para destacar o perfil dele.
3. EVENTOS NO RIO DE JANEIRO: Com base nos resultados da web acima, liste eventos gratuitos ou até R$ 50 de Engenharia Química/Energia/Tech no RJ no formato: "Dia DD/MM, evento [Nome] no [Local] sobre [Assunto], inscrições até dia DD/MM". Se não houver datas exatas nos resultados, informe o status real encontrado sem inventar datas.

Pergunta do usuário: "${promptUsuario}"
`;

  return await chamarIA(promptFinal, emails, agenda, clima, perfilObj, eventosArr);
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function iniciarChat() {
  const hora = new Date().getHours();
  let saudacao = 'Bom dia';
  if (hora >= 12 && hora < 18) saudacao = 'Boa tarde';
  else if (hora >= 18 || hora < 5) saudacao = 'Boa noite';

  const mensagemInicial = `${saudacao}, senhor! Sistemas integrados prontos. Como posso ajudar hoje?`;
  console.log(`\n[JARVIS]: ${mensagemInicial}\n`);
  await falarJarvis(mensagemInicial);
  perguntar();
}

function perguntar() {
  rl.question('Você: ', async (input) => {
    if (input.trim().toLowerCase() === 'sair') {
      const despedida = "Desligando sistemas. Até logo, senhor!";
      console.log(`\n[JARVIS]: ${despedida}`);
      await falarJarvis(despedida);
      rl.close();
      process.exit(0);
    }

    if (!input.trim()) {
      perguntar();
      return;
    }

    try {
      console.log('[JARVIS] Processando...');
      const resposta = await generateWithJarvis(input);
      console.log(`\n[JARVIS]:\n${resposta}\n`);
      await falarJarvis(resposta);
    } catch (error) {
      console.error(`\n[ERRO]: ${error.message}\n`);
    }

    perguntar();
  });
}

iniciarChat();