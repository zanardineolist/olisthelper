import { google } from 'googleapis';
import Redis from 'ioredis';

// Configuração do Redis
const redis = new Redis(process.env.REDIS_URL);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { userEmail } = req.query;

  if (!userEmail) {
    return res.status(400).json({ error: 'E-mail do usuário é obrigatório' });
  }

  try {
    // Verificar no cache se já temos os dados de ajuda solicitada
    const cachedHelpRequests = await redis.get(`userHelpRequests:${userEmail}`);
    if (cachedHelpRequests) {
      console.log('Cache hit for user help requests data');
      return res.status(200).json(JSON.parse(cachedHelpRequests));
    }

    console.log('Cache miss for user help requests data, fetching from Google Sheets');

    // Autenticação com o Google Sheets API
    const auth = new google.auth.JWT(
      process.env.GOOGLE_CLIENT_EMAIL,
      null,
      process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      ['https://www.googleapis.com/auth/spreadsheets']
    );

    const sheets = google.sheets({ version: 'v4', auth });
    const sheetId = process.env.SHEET_ID;

    // Obter metadados da planilha
    const sheetMeta = await sheets.spreadsheets.get({
      spreadsheetId: sheetId,
    });

    // Obter todas as abas da planilha
    const sheetNames = sheetMeta.data.sheets.map(sheet => sheet.properties.title);

    // Filtrar apenas as abas que representam analistas
    const analystSheetNames = sheetNames.filter(name => name.startsWith('#'));

    let currentMonthCount = 0;
    let lastMonthCount = 0;

    // Data atual
    const today = new Date();
    const brtDate = new Date(today.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    const currentMonth = brtDate.getMonth();
    const currentYear = brtDate.getFullYear();

    // Iterar sobre todas as abas de analistas para obter os registros de ajuda
    for (const sheetName of analystSheetNames) {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: `${sheetName}!A:F`,
      });

      const rows = response.data.values || [];

      // Ignorar o cabeçalho
      rows.shift();

      for (const row of rows) {
        const [dateString, , , email] = row;

        if (email === userEmail) {
          const [day, month, year] = dateString.split('/').map(Number);
          const recordDate = new Date(year, month - 1, day);

          // Verificar se o registro pertence ao mês atual ou anterior
          if (recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear) {
            currentMonthCount++;
          } else if (
            recordDate.getMonth() === currentMonth - 1 &&
            recordDate.getFullYear() === currentYear
          ) {
            lastMonthCount++;
          } else if (currentMonth === 0 && recordDate.getMonth() === 11 && recordDate.getFullYear() === currentYear - 1) {
            lastMonthCount++;
          }
        }
      }
    }

    const responsePayload = {
      currentMonth: currentMonthCount,
      lastMonth: lastMonthCount,
    };

    // Armazenar no cache por 10 minutos
    await redis.set(`userHelpRequests:${userEmail}`, JSON.stringify(responsePayload), 'EX', 600);

    res.status(200).json(responsePayload);
  } catch (error) {
    console.error('Erro ao obter ajudas solicitadas:', error);
    res.status(500).json({ error: 'Erro ao obter as ajudas solicitadas. Verifique suas credenciais e a configuração do Google Sheets.' });
  }
}