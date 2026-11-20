import 'dotenv/config';
import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import readline from 'readline';

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/calendar.readonly'
];

const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

// Função para carregar credenciais e autenticar
async function authorize() {
  const content = fs.readFileSync(CREDENTIALS_PATH);
  const credentials = JSON.parse(content);
  const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
  
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  try {
    const token = fs.readFileSync(TOKEN_PATH);
    oAuth2Client.setCredentials(JSON.parse(token));
    return oAuth2Client;
  } catch (err) {
    return await getAccessToken(oAuth2Client);
  }
}

async function getAccessToken(oAuth2Client) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  
  console.log('\n[AUTORIZAÇÃO NECESSÁRIA]');
  console.log('Abra este link no seu navegador para autorizar o Jarvis:\n', authUrl);
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve, reject) => {
    rl.question('\nCole o código de verificação aqui: ', (code) => {
      rl.close();
      oAuth2Client.getToken(code, (err, token) => {
        if (err) return reject('Erro ao recuperar o token de acesso: ' + err);
        oAuth2Client.setCredentials(token);
        fs.writeFileSync(TOKEN_PATH, JSON.stringify(token));
        console.log('Token salvo com sucesso em token.json!\n');
        resolve(oAuth2Client);
      });
    });
  });
}

// Função para buscar e-mails não lidos
async function verificarEmails(auth) {
  const gmail = google.gmail({ version: 'v1', auth });
  const res = await gmail.users.messages.list({
    userId: 'me',
    q: 'is:unread in:inbox',
    maxResults: 5,
  });

  const messages = res.data.messages;
  if (!messages || messages.length === 0) {
    return 'Você não tem e-mails não lidos na caixa de entrada.';
  }

  let resumo = 'E-mails não lidos:\n';
  for (const message of messages) {
    const msg = await gmail.users.messages.get({ userId: 'me', id: message.id });
    const subject = msg.data.payload.headers.find(h => h.name === 'Subject')?.value || 'Sem assunto';
    const sender = msg.data.payload.headers.find(h => h.name === 'From')?.value || 'Desconhecido';
    resumo += `- De: ${sender} | Assunto: ${subject}\n`;
  }
  return resumo;
}

// Função para verificar eventos de hoje no Calendar
async function verificarAgenda(auth) {
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
  if (!events || events.length === 0) {
    return 'Você não tem mais compromissos agendados para hoje.';
  }

  let resumo = 'Próximos eventos de hoje:\n';
  events.forEach((event) => {
    const start = event.start.dateTime || event.start.date;
    resumo += `- ${event.summary} (Início: ${new Date(start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})})\n`;
  });
  return resumo;
}

// Execução principal de teste
async function run() {
  try {
    console.log('[JARVIS] Conectando ao Google Workspace...');
    const auth = await authorize();
    
    console.log('[JARVIS] Lendo e-mails e agenda...');
    const emails = await verificarEmails(auth);
    const agenda = await verificarAgenda(auth);

    console.log('\n--- RELATÓRIO DO JARVIS ---');
    console.log(emails);
    console.log('\n' + agenda);
    console.log('---------------------------');
  } catch (error) {
    console.error('Erro na integração:', error);
  }
}

run();