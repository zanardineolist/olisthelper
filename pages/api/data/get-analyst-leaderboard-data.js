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

    // Buscar a aba que corresponde ao ID do analista
    const sheetName = sheetMeta.data.sheets.find(sheet => sheet.properties.title.startsWith(`#${analystId}`))?.properties.title;

    if (!sheetName) {
      return res.status(400).json({ error: `A aba correspondente ao ID '${analystId}' não existe na planilha.` });
    }

    // Obter os valores da aba do analista
    const rows = await getSheetValues(sheetName, 'A:F');
    if (!rows || rows.length === 0) {
      return res.status(200).json({ leaderboard: [] });
    }

    // Filtrar registros com base no dateRange, se fornecido
    const filteredRows = dateRange ? filterRowsByDate(rows, dateRange) : rows.slice(1); // Pula o cabeçalho

    // Formatar os dados para o leaderboard
    const leaderboardData = filteredRows.map(row => ({
      date: row[0],
      metric: row[1], // Ajuste conforme a coluna desejada
      score: row[2],
      analystName: row[3],
      additionalData: row.slice(4), // Outras informações, se houver
    }));

    return res.status(200).json({ leaderboard: leaderboardData });
  } catch (error) {
    console.error('Erro ao obter registros do analista:', error);
    res.status(500).json({ error: 'Erro ao obter registros do analista.' });
  }
}

// Função para filtrar registros com base em uma faixa de datas
function filterRowsByDate(rows, dateRange) {
  const [start, end] = dateRange.split('|');
  const startDate = new Date(start);
  const endDate = new Date(end);

  return rows.filter((row, index) => {
    if (index === 0) return false; // Ignorar o cabeçalho
    const [day, month, year] = row[0].split('/').map(Number);
    const recordDate = new Date(year, month - 1, day);
    return recordDate >= startDate && recordDate <= endDate;
  });
}
