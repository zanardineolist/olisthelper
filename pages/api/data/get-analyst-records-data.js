import { getAuthenticatedGoogleSheets, getSheetMetaData, getSheetValues } from '../../utils/googleSheets';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { analystId, dateRange, mode } = req.query;

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
      return res.status(200).json({ records: [] });
    }

    // Filtrar registros de acordo com o modo
    let filteredRows = rows.slice(1); // Pular o cabeçalho
    if (dateRange) {
      filteredRows = filterRowsByDate(filteredRows, dateRange);
    }

    if (mode === 'profile') {
      const { currentMonthCount, lastMonthCount } = countRecordsForProfile(filteredRows);
      return res.status(200).json({ currentMonthCount, lastMonthCount, records: filteredRows });
    }

    // Resposta padrão para registros gerais
    return res.status(200).json({ records: filteredRows });
  } catch (error) {
    console.error('Erro ao obter registros do analista:', error);
    res.status(500).json({ error: 'Erro ao obter registros do analista.' });
  }
}

// Função para filtrar registros com base em um intervalo de datas
function filterRowsByDate(rows, dateRange) {
  const [start, end] = dateRange.split('|');
  const startDate = new Date(start);
  const endDate = new Date(end);

  return rows.filter(row => {
    const [dateStr] = row;
    const [day, month, year] = dateStr.split('/').map(Number);
    const recordDate = new Date(year, month - 1, day);
    return recordDate >= startDate && recordDate <= endDate;
  });
}

// Função para contar registros do perfil (mês atual e mês anterior)
function countRecordsForProfile(rows) {
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1; // Mês atual (1-12)
  const currentYear = currentDate.getFullYear();
  const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1; // Mês anterior
  const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;

  let currentMonthCount = 0;
  let lastMonthCount = 0;

  rows.forEach(row => {
    const [dateStr] = row;
    const [day, month, year] = dateStr.split('/').map(Number);

    if (year === currentYear && month === currentMonth) {
      currentMonthCount++;
    } else if (year === lastMonthYear && month === lastMonth) {
      lastMonthCount++;
    }
  });

  return { currentMonthCount, lastMonthCount };
}
