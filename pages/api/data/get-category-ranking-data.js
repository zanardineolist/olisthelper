import { getAuthenticatedGoogleSheets, getSheetMetaData, getSheetValues } from '../../utils/googleSheets';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { analystId, dateRange } = req.query;

  if (!analystId) {
    return res.status(400).json({ error: 'ID do analista é obrigatório.' });
  }

  try {
    // Autenticar e obter metadados da planilha
    const sheets = await getAuthenticatedGoogleSheets();
    const sheetMeta = await getSheetMetaData();

    // Buscar a aba correspondente ao ID do analista
    const sheetName = sheetMeta.data.sheets.find(sheet => sheet.properties.title.startsWith(`#${analystId}`))?.properties.title;

    if (!sheetName) {
      return res.status(400).json({ error: `A aba correspondente ao ID '${analystId}' não existe na planilha.` });
    }

    // Obter os valores da aba do analista
    const rows = await getSheetValues(sheetName, 'A:F');
    if (!rows || rows.length === 0) {
      return res.status(200).json({ categories: [] });
    }

    // Filtrar registros com base no dateRange, se fornecido
    const filteredRows = dateRange ? filterRowsByDate(rows, dateRange) : rows.slice(1); // Pular cabeçalho

    // Contar categorias e calcular ranking
    const categoryCounts = countCategories(filteredRows);

    // Ordenar e pegar as top 10 categorias
    const sortedCategories = Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    return res.status(200).json({ categories: sortedCategories });
  } catch (error) {
    console.error('Erro ao obter registros das categorias:', error);
    res.status(500).json({ error: 'Erro ao obter registros das categorias.' });
  }
}

// Função para filtrar registros com base em um intervalo de datas
function filterRowsByDate(rows, dateRange) {
  const [start, end] = dateRange.split('|');
  const startDate = new Date(start);
  const endDate = new Date(end);

  return rows.filter((row, index) => {
    if (index === 0) return false; // Ignorar cabeçalho
    const [dateStr] = row;
    const [day, month, year] = dateStr.split('/').map(Number);
    const recordDate = new Date(year, month - 1, day);
    return recordDate >= startDate && recordDate <= endDate;
  });
}

// Função para contar categorias
function countCategories(rows) {
  return rows.reduce((acc, row) => {
    const category = row[4];
    if (category) {
      acc[category] = (acc[category] || 0) + 1;
    }
    return acc;
  }, {});
}
