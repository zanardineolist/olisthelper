import { google } from 'googleapis';
import Redis from 'ioredis';

// Configuração do Redis
const redis = new Redis(process.env.REDIS_URL);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { userName, userEmail, category, description, analystId } = req.body;

  if (!userName || !userEmail || !category || !description || !analystId) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
  }

  try {
    // Verificar no cache se a aba do analista já foi encontrada
    const cachedSheetName = await redis.get(`analystSheet:${analystId}`);
    let sheetName;

    if (cachedSheetName) {
      console.log('Cache hit for analyst sheet name');
      sheetName = cachedSheetName;
    } else {
      console.log('Cache miss for analyst sheet name, fetching from Google Sheets');

      const auth = new google.auth.JWT(
        process.env.GOOGLE_CLIENT_EMAIL,
        null,
        process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        ['https://www.googleapis.com/auth/spreadsheets']
      );

      const sheets = google.sheets({ version: 'v4', auth });
      const sheetId = process.env.SHEET_ID;

      // Buscar a aba correspondente ao analista (a aba deve começar com o ID do analista)
      const sheetMeta = await sheets.spreadsheets.get({
        spreadsheetId: sheetId,
      });

      sheetName = sheetMeta.data.sheets.find((sheet) =>
        sheet.properties.title.startsWith(`#${analystId}`)
      )?.properties.title;

      if (!sheetName) {
        return res.status(400).json({ error: `A aba correspondente ao ID '${analystId}' não existe na planilha.` });
      }

      // Armazenar o nome da aba no cache por 10 minutos
      await redis.set(`analystSheet:${analystId}`, sheetName, 'EX', 600);
    }

    const auth = new google.auth.JWT(
      process.env.GOOGLE_CLIENT_EMAIL,
      null,
      process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      ['https://www.googleapis.com/auth/spreadsheets']
    );

    const sheets = google.sheets({ version: 'v4', auth });
    const sheetId = process.env.SHEET_ID;

    // Formatar a data e hora atuais para o horário de Brasília (UTC-3)
    const date = new Date();
    const brtDate = new Date(date.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    const formattedDate = brtDate.toLocaleDateString('pt-BR');
    const formattedTime = brtDate.toLocaleTimeString('pt-BR');

    // Adicionar os dados na aba do analista
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: `${sheetName}!A:F`,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [[formattedDate, formattedTime, userName, userEmail, category, description]],
      },
    });

    res.status(200).json({ message: 'Ajuda registrada com sucesso.' });
  } catch (error) {
    console.error('Erro ao registrar ajuda:', error);
    res.status(500).json({ error: 'Erro ao registrar a ajuda. Verifique suas credenciais e a configuração do Google Sheets.' });
  }
}