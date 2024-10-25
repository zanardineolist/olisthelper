import { google } from 'googleapis';
import Redis from 'ioredis';

// Configuração do Redis
const redis = new Redis(process.env.REDIS_URL);

export default async function handler(req, res) {
  try {
    // Verificar no cache se já temos os analistas e categorias
    const cachedData = await redis.get('analystsCategories');
    if (cachedData) {
      console.log('Cache hit for analysts and categories data');
      return res.status(200).json(JSON.parse(cachedData));
    }

    console.log('Cache miss for analysts and categories data, fetching from Google Sheets');

    const auth = new google.auth.JWT(
      process.env.GOOGLE_CLIENT_EMAIL,
      null,
      process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      ['https://www.googleapis.com/auth/spreadsheets']
    );

    const sheets = google.sheets({ version: 'v4', auth });
    const sheetId = process.env.SHEET_ID;

    // Buscar as categorias da aba "Categorias"
    const categoriesResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Categorias!A2:A',
    });
    const categories = categoriesResponse.data.values.flat();

    // Buscar os analistas da aba "Usuários"
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Usuários!A:D',
    });

    const rows = response.data.values;
    const analysts = rows
      .filter((row) => row[3] === 'analyst')
      .map((row) => ({
        id: row[0],
        name: row[1],
      }));

    const responsePayload = { analysts, categories };

    // Armazenar os analistas e categorias no cache por 10 minutos
    await redis.set('analystsCategories', JSON.stringify(responsePayload), 'EX', 600);

    res.status(200).json(responsePayload);
  } catch (error) {
    console.error('Erro ao obter analistas e categorias:', error);
    res.status(500).json({ error: 'Erro ao carregar dados.' });
  }
}