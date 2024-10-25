import { google } from 'googleapis';
import Redis from 'ioredis';

// Configuração do Redis
const redis = new Redis(process.env.REDIS_URL);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verificar no cache se já temos os dados dos usuários
    const cachedUsers = await redis.get('usersList');
    if (cachedUsers) {
      console.log('Cache hit for users list');
      return res.status(200).json(JSON.parse(cachedUsers));
    }

    console.log('Cache miss for users list, fetching from Google Sheets');

    const auth = new google.auth.JWT(
      process.env.GOOGLE_CLIENT_EMAIL,
      null,
      JSON.parse(`"${process.env.GOOGLE_PRIVATE_KEY}"`),
      ['https://www.googleapis.com/auth/spreadsheets']
    );

    const sheets = google.sheets({ version: 'v4', auth });
    const sheetId = process.env.SHEET_ID;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Usuários!A:D',
    });

    const rows = response.data.values;
    if (rows) {
      const users = rows.filter(row => row[3] === 'user').map(row => ({
        id: row[0],
        name: row[1],
        email: row[2],
      }));

      // Armazenar os dados no cache por 10 minutos
      await redis.set('usersList', JSON.stringify({ users }), 'EX', 600);

      return res.status(200).json({ users });
    }

    return res.status(404).json({ error: 'Nenhum usuário encontrado.' });
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    return res.status(500).json({ error: 'Erro ao buscar usuários. Verifique suas credenciais e a configuração do Google Sheets.' });
  }
}