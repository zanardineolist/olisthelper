import { google } from 'googleapis';

export default async function handler(req, res) {
  try {
    const auth = new google.auth.JWT(
      process.env.GOOGLE_CLIENT_EMAIL,
      null,
      process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      ['https://www.googleapis.com/auth/spreadsheets']
    );

    const sheets = google.sheets({ version: 'v4', auth });
    const sheetId = process.env.SHEET_ID;

    // Obter categorias
    const categoriesResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Categorias!A1:A',
    });
    const categories = categoriesResponse.data.values.flat();

    // Obter analistas
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

    res.status(200).json({ analysts, categories });
  } catch (error) {
    console.error('Erro ao obter analistas e categorias:', error);
    res.status(500).json({ error: 'Erro ao carregar dados.' });
  }
}
