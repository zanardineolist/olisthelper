import { google } from 'googleapis';

let cache = {
  timestamp: null,
  data: {},
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { userEmail } = req.query;

  if (!userEmail) {
    return res.status(400).json({ error: 'E-mail do usuário é obrigatório' });
  }

  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos de cache

  // Verificar se os dados do usuário em cache ainda são válidos
  const currentTime = Date.now();
  if (cache.timestamp && currentTime - cache.timestamp < CACHE_DURATION && cache.data[userEmail]) {
    console.log('Servindo dados do cache para o usuário:', userEmail);
    return res.status(200).json(cache.data[userEmail]);
  }

  try {
    const auth = new google.auth.JWT(
      process.env.GOOGLE_CLIENT_EMAIL,
      null,
      process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      ['https://www.googleapis.com/auth/spreadsheets']
    );

    const sheets = google.sheets({ version: 'v4', auth });
    const sheetId = process.env.SHEET_ID;

    // Obter metadados da planilha
    console.log(`Buscando metadados da planilha com ID: ${sheetId}`);
    const sheetMeta = await sheets.spreadsheets.get({
      spreadsheetId: sheetId,
    });

    // Obter todas as abas da planilha
    const sheetNames = sheetMeta.data.sheets.map(sheet => sheet.properties.title);

    // Filtrar apenas as abas que representam analistas (pode ser necessário ajustar a lógica de nomes)
    const analystSheetNames = sheetNames.filter(name => name.startsWith('#'));

    let currentMonthCount = 0;
    let lastMonthCount = 0;

    // Data atual
    const today = new Date();
    const brtDate = new Date(today.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    const currentMonth = brtDate.getMonth();
    const currentYear = brtDate.getFullYear();

    // Executar as requisições de forma paralela para obter os registros de ajuda de todas as abas de analistas
    const requests = analystSheetNames.map(async (sheetName) => {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: `${sheetName}!A:F`,
      });
      return response.data.values || [];
    });

    // Aguardar todas as requisições completarem
    const results = await Promise.all(requests);

    results.forEach(rows => {
      // Ignorar o cabeçalho
      rows.shift();

      for (const row of rows) {
        const [dateString, , , email] = row;

        if (email === userEmail) {
          const [day, month, year] = dateString.split('/').map(Number);
          const recordDate = new Date(year, month - 1, day);

          // Verificar se o registro pertence ao mês atual ou ao mês anterior
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
    });

    const responsePayload = {
      currentMonth: currentMonthCount,
      lastMonth: lastMonthCount,
    };

    // Atualizar o cache
    cache.timestamp = Date.now();
    cache.data[userEmail] = responsePayload;

    return res.status(200).json(responsePayload);
  } catch (error) {
    console.error('Erro ao obter ajudas solicitadas:', error);
    res.status(500).json({ error: 'Erro ao obter as ajudas solicitadas. Verifique suas credenciais e a configuração do Google Sheets.' });
  }
}