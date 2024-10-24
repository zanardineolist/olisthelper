// pages/api/get-user-category-ranking.js
import { google } from 'googleapis';

export default async function handler(req, res) {
  const { userEmail } = req.query;

  if (!userEmail || userEmail === 'undefined') {
    console.log('Erro: E-mail do usuário não fornecido ou inválido.');
    return res.status(400).json({ error: 'E-mail do usuário é obrigatório e deve ser válido.' });
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

    console.log(`Buscando metadados da planilha com ID: ${sheetId} para o usuário: ${userEmail}`);

    // Obter as informações da planilha (metadados)
    const sheetMeta = await sheets.spreadsheets.get({
      spreadsheetId: sheetId,
    });

    // Iterar sobre todas as abas da planilha, pois queremos buscar os dados para todos os analistas
    const sheetNames = sheetMeta.data.sheets.map(sheet => sheet.properties.title);

    let rows = [];

    for (const sheetName of sheetNames) {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: `${sheetName}!A:F`,
      });
      rows = rows.concat(response.data.values || []);
    }

    if (!rows || rows.length === 0) {
      console.log('Nenhum registro encontrado.');
      return res.status(200).json({ categories: [] });
    }

    // Filtrar registros do mês atual e do usuário especificado
    const currentDate = new Date();
    const brtDate = new Date(currentDate.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    const currentMonth = brtDate.getMonth();
    const currentYear = brtDate.getFullYear();

    const currentMonthRows = rows.filter((row, index) => {
      if (index === 0) return false; // Pular cabeçalho
      const [dateStr, , , email, category] = row;
      if (email !== userEmail) return false;

      const [day, month, year] = dateStr.split('/').map(Number);
      const date = new Date(year, month - 1, day);

      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });

    // Contar categorias
    const categoryCounts = currentMonthRows.reduce((acc, row) => {
      const category = row[4];

      if (category) {
        acc[category] = (acc[category] || 0) + 1;
      }

      return acc;
    }, {});

    // Ordenar e pegar as top 10 categorias
    const sortedCategories = Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    console.log('Categorias no ranking:', sortedCategories);

    return res.status(200).json({ categories: sortedCategories });
  } catch (error) {
    console.error('Erro ao obter registros das categorias:', error);
    res.status(500).json({ error: 'Erro ao obter registros das categorias.' });
  }
}
