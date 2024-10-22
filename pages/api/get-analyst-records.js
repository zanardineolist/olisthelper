import { google } from 'googleapis';

export default async function handler(req, res) {
  const { analystId, filter } = req.query;

  if (!analystId || analystId === 'undefined' || !filter) {
    return res.status(400).json({ error: 'ID do analista e filtro são obrigatórios e devem ser válidos.' });
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

    // Obter as informações da planilha (metadados)
    const sheetMeta = await sheets.spreadsheets.get({
      spreadsheetId: sheetId,
    });

    // Buscar a aba que começa com o ID do analista (por exemplo, "#8487")
    const sheetName = sheetMeta.data.sheets.find((sheet) => {
      return sheet.properties.title.startsWith(`#${analystId}`);
    })?.properties.title;

    if (!sheetName) {
      return res.status(400).json({ error: `A aba correspondente ao ID '${analystId}' não existe na planilha.` });
    }

    // Caso a aba seja encontrada, prosseguir para obter os valores
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
      if (index === 0) return false;

      const [dateStr] = row;
      const [day, month, year] = dateStr.split('/');
      const date = new Date(`${year}-${month}-${day}`);

      const diffTime = currentDate - date;
      const diffDays = diffTime / (1000 * 60 * 60 * 24);

      return diffDays <= filter;
    });

    if (!filteredRows || filteredRows.length === 0) {
      return res.status(200).json({ count: 0, dates: [], counts: [] });
    }

    const count = filteredRows.length;
    const dates = filteredRows.map((row) => row[0]);
    const countsObj = dates.reduce((acc, date) => {
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});

    res.status(200).json({
      count,
      dates: Object.keys(countsObj),
      counts: Object.values(countsObj),
    });
  } catch (error) {
    console.error('Erro ao obter registros do analista:', error);
    res.status(500).json({ error: 'Erro ao obter registros.' });
  }
}