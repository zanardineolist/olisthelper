import { google } from 'googleapis';

export default async function handler(req, res) {
  const { analystId, mode } = req.query;

  if (!analystId || analystId === 'undefined') {
    console.log('Erro: ID do analista não fornecido ou inválido.');
    return res.status(400).json({ error: 'ID do analista é obrigatório e deve ser válido.' });
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

    console.log(`Buscando metadados da planilha com ID: ${sheetId} para o analista: ${analystId}`);

    // Obter as informações da planilha (metadados)
    const sheetMeta = await sheets.spreadsheets.get({
      spreadsheetId: sheetId,
    });

    // Buscar a aba que começa com o ID do analista (por exemplo, "#8487")
    const sheetName = sheetMeta.data.sheets.find((sheet) => {
      return sheet.properties.title.startsWith(`#${analystId}`);
    })?.properties.title;

    if (!sheetName) {
      console.log(`Erro: A aba correspondente ao ID '${analystId}' não existe na planilha.`);
      return res.status(400).json({ error: `A aba correspondente ao ID '${analystId}' não existe na planilha.` });
    }

    console.log(`Aba localizada: ${sheetName}`);

    // Caso a aba seja encontrada, prosseguir para obter os valores
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${sheetName}!A:F`,
    });

    const rows = response.data.values;

    if (!rows || rows.length === 0) {
      console.log('Nenhum registro encontrado na aba especificada.');
      return res.status(200).json({ rows: [] });
    }

    console.log(`Total de registros encontrados: ${rows.length}`);

    if (mode === 'leaderboard') {
      // Filtrar todos os registros do mês atual para o leaderboard
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();

      const leaderboardRows = rows.filter((row, index) => {
        if (index === 0) return false; // Pular cabeçalho

        const [dateStr] = row;
        const [day, month, year] = dateStr.split('/').map(Number);
        const date = new Date(year, month - 1, day);

        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
      });

      console.log(`Total de registros para o leaderboard: ${leaderboardRows.length}`);

      return res.status(200).json({ rows: leaderboardRows });
    }

    // Lógica padrão (com filtro)
    const currentDate = new Date();
    const filteredRows = rows.filter((row, index) => {
      if (index === 0) return false;

      const [dateStr] = row;
      const [day, month, year] = dateStr.split('/');
      const date = new Date(`${year}-${month}-${day}`);

      const diffTime = currentDate - date;
      const diffDays = diffTime / (1000 * 60 * 60 * 24);

      return diffDays <= req.query.filter;
    });

    if (!filteredRows || filteredRows.length === 0) {
      console.log('Nenhum registro encontrado após o filtro aplicado.');
      return res.status(200).json({ count: 0, dates: [], counts: [], rows: [] });
    }

    console.log(`Total de registros após o filtro: ${filteredRows.length}`);

    const count = filteredRows.length;
    const dates = filteredRows.map((row) => row[0]);
    const countsObj = dates.reduce((acc, date) => {
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});

    console.log('Contagem de registros por data:', countsObj);

    res.status(200).json({
      count,
      dates: Object.keys(countsObj),
      counts: Object.values(countsObj),
      rows: filteredRows,
    });
  } catch (error) {
    console.error('Erro ao obter registros do analista:', error);
    res.status(500).json({ error: 'Erro ao obter registros.' });
  }
}