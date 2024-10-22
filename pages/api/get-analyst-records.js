import { google } from 'googleapis';

export default async function handler(req, res) {
  const { analystId, filter } = req.query;

  if (!analystId) {
    return res.status(400).json({ error: 'Analyst ID é obrigatório' });
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

    const sheetName = `#${analystId}`; // Nome da aba com o ID do analista
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${sheetName}!A:F`,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return res.status(200).json({ count: 0, dates: [], counts: [] });
    }

    const currentDate = new Date();
    const filteredRows = rows.filter((row, index) => {
      if (index === 0) return false; // Ignorar cabeçalho

      const [dateStr] = row;
      const [day, month, year] = dateStr.split('/');
      const date = new Date(`${year}-${month}-${day}`);

      const diffTime = currentDate - date;
      const diffDays = diffTime / (1000 * 60 * 60 * 24);

      return diffDays <= filter;
    });

    const count = filteredRows.length;

    const dates = filteredRows.map((row) => row[0]);
    const counts = dates.reduce((acc, date) => {
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});

    res.status(200).json({
      count,
      dates: Object.keys(counts),
      counts: Object.values(counts),
    });
  } catch (error) {
    console.error('Erro ao obter registros do analista:', error);
    res.status(500).json({ error: 'Erro ao obter registros.' });
  }
}
