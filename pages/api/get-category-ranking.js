// pages/api/get-category-ranking.js
import { getAuthenticatedGoogleSheets, getSheetMetaData, getSheetValues } from '../../utils/googleSheets';

export default async function handler(req, res) {
  const { userEmail, analystId } = req.query;

  if ((!userEmail && !analystId) || (userEmail === 'undefined' && analystId === 'undefined')) {
    console.log('Erro: E-mail do usuário ou ID do analista devem ser fornecidos e válidos.');
    return res.status(400).json({ error: 'E-mail do usuário ou ID do analista são obrigatórios e devem ser válidos.' });
  }

  try {
    const sheets = await getAuthenticatedGoogleSheets();
    const sheetId = process.env.SHEET_ID;

    console.log(`Buscando metadados da planilha com ID: ${sheetId}`);

    // Obter as informações da planilha (metadados)
    const sheetMeta = await getSheetMetaData();
    let rows = [];

    if (analystId) {
      // Lógica para obter dados de um analista específico
      console.log(`Buscando dados para o analista: ${analystId}`);

      // Buscar a aba que começa com o ID do analista (por exemplo, "#8487")
      const sheetName = sheetMeta.data.sheets.find((sheet) => {
        return sheet.properties.title.startsWith(`#${analystId}`);
      })?.properties.title;

      if (!sheetName) {
        console.log(`Erro: A aba correspondente ao ID '${analystId}' não existe na planilha.`);
        return res.status(400).json({ error: `A aba correspondente ao ID '${analystId}' não existe na planilha.` });
      }

      console.log(`Aba localizada: ${sheetName}`);
      rows = await getSheetValues(sheetName, 'A:F');
    } else if (userEmail) {
      // Lógica para obter dados para um usuário específico
      console.log(`Buscando dados para o usuário: ${userEmail}`);

      // Iterar sobre todas as abas da planilha, pois queremos buscar os dados para todos os analistas
      const sheetNames = sheetMeta.data.sheets.map(sheet => sheet.properties.title);

      for (const sheetName of sheetNames) {
        const response = await getSheetValues(sheetName, 'A:F');
        rows = rows.concat(response);
      }
    }

    if (!rows || rows.length === 0) {
      console.log('Nenhum registro encontrado.');
      return res.status(200).json({ categories: [] });
    }

    // Filtrar registros do mês atual
    const currentDate = new Date();
    const brtDate = new Date(currentDate.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    const currentMonth = brtDate.getMonth();
    const currentYear = brtDate.getFullYear();

    const currentMonthRows = rows.filter((row, index) => {
      if (index === 0) return false; // Pular cabeçalho
      const [dateStr, , , email, category] = row;

      if (userEmail && email !== userEmail) return false; // Filtrar por e-mail se fornecido

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
