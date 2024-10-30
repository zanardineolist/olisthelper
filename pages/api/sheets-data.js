// pages/api/sheets-data.js
import { getAuthenticatedGoogleSheets, getSheetMetaData, getSheetValues } from '../../utils/googleSheets';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { sheetType, sheetTab, infoType } = req.query;

  // Mapear os IDs das planilhas
  const SHEET_IDS = {
    database: '1U6M-un3ozKnQXa2LZEzGIYibYBXRuoWBDkiEaMBrU34',
    indicators: '1mQQvwJrCg6_ymYIo-bpJUSsJUub4DrhNaZmP_u5C6nI',
  };

  // Verificar se os parâmetros necessários foram fornecidos
  if (!sheetType || !sheetTab || !infoType) {
    return res.status(400).json({ error: 'sheetType, sheetTab e infoType são obrigatórios.' });
  }

  // Verificar se o tipo de planilha é válido
  const sheetId = SHEET_IDS[sheetType];
  if (!sheetId) {
    return res.status(400).json({ error: 'Tipo de planilha inválido.' });
  }

  try {
    const sheets = await getAuthenticatedGoogleSheets();

    let actualSheetTab = sheetTab;

    // Se o tipo for 'database' e estamos lidando com um analista, buscar a aba correta
    if (sheetType === 'database' && sheetTab.startsWith('Analista-')) {
      const analystId = sheetTab.replace('Analista-', '').trim();

      // Obter metadados para encontrar a aba correspondente ao analista
      const metaData = await getSheetMetaData(sheetId);
      const matchingSheet = metaData.sheets.find(sheet => sheet.properties.title.includes(analystId));

      if (!matchingSheet) {
        return res.status(404).json({ error: `Aba para o analista ${analystId} não encontrada.` });
      }

      actualSheetTab = matchingSheet.properties.title;
    }

    const range = `'${actualSheetTab}'!A:Z`; // Definindo o intervalo da aba de maneira consistente
    const rows = await getSheetValues(sheetId, range);

    if (!rows || rows.length === 0) {
      return res.status(200).json({ data: [] });
    }

    let result;

    // Escolha da operação com base no tipo de informação solicitada
    switch (infoType) {
      case 'userInfo':
        result = handleUserInfo(rows);
        break;
      case 'categoryRanking':
        result = handleCategoryRanking(rows);
        break;
      case 'performance':
        result = handlePerformance(rows);
        break;
      default:
        return res.status(400).json({ error: 'Tipo de informação inválido.' });
    }

    return res.status(200).json({ data: result });
  } catch (error) {
    console.error('Erro ao buscar dados da planilha:', error);
    return res.status(500).json({ error: 'Erro ao buscar dados da planilha.' });
  }
}

// Função para tratar informações de usuário
function handleUserInfo(rows) {
  return rows.map((row, index) => {
    if (index === 0) return null; // Ignorar o cabeçalho
    const [id, name, email, role] = row;
    return { id, name, email, role };
  }).filter(Boolean);
}

// Função para tratar o ranking de categorias
function handleCategoryRanking(rows) {
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  const currentMonthRows = rows.filter((row, index) => {
    if (index === 0) return false; // Ignorar o cabeçalho

    const [dateStr] = row;
    const [day, month, year] = dateStr.split('/').map(Number);
    const date = new Date(year, month - 1, day);

    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  });

  return currentMonthRows.reduce((acc, row) => {
    const category = row[4];
    if (category) {
      acc[category] = (acc[category] || 0) + 1;
    }
    return acc;
  }, {});
}

// Função para tratar dados de desempenho
function handlePerformance(rows) {
  return rows.map((row, index) => {
    if (index === 0) return null; // Ignorar o cabeçalho
    const [date, tipo, email, tma, csat, perdido] = row;
    return { date, tipo, email, tma, csat, perdido };
  }).filter(Boolean);
}
