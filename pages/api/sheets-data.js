import { getAuthenticatedGoogleSheets, getSheetMetaData, getSheetValues } from '../../utils/googleSheets';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { sheetType, sheetTab, infoType } = req.query;

  const SHEET_IDS = {
    database: '1U6M-un3ozKnQXa2LZEzGIYibYBXRuoWBDkiEaMBrU34',
    indicators: '1mQQvwJrCg6_ymYIo-bpJUSsJUub4DrhNaZmP_u5C6nI',
  };

  if (!sheetType || !sheetTab || !infoType) {
    console.error(`Erro: Parâmetros ausentes. Recebido sheetType: ${sheetType}, sheetTab: ${sheetTab}, infoType: ${infoType}`);
    return res.status(400).json({ error: 'sheetType, sheetTab e infoType são obrigatórios.' });
  }

  const sheetId = SHEET_IDS[sheetType];
  if (!sheetId) {
    console.error(`Erro: Tipo de planilha inválido: ${sheetType}`);
    return res.status(400).json({ error: 'Tipo de planilha inválido.' });
  }

  try {
    const sheets = await getAuthenticatedGoogleSheets();
    let actualSheetTab = `#${sheetTab}`; // Utilizando o numeral da aba

    // Buscar metadados da planilha para verificar a existência da aba
    const metaData = await getSheetMetaData(sheetId);
    const sheetExists = metaData.sheets.some(sheet => sheet.properties.title === actualSheetTab);

    if (!sheetExists) {
      return res.status(404).json({ error: `Aba para o tipo ${sheetType} com ID ${sheetTab} não encontrada.` });
    }

    const range = `'${actualSheetTab}'!A:Z`;
    const rows = await getSheetValues(sheetId, range);

    if (!rows || rows.length === 0) {
      return res.status(200).json({ data: [] });
    }

    let result;
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

// Função para processar informações de usuários
function handleUserInfo(rows) {
  return rows.map((row, index) => {
    if (index === 0) return null; // Ignorar cabeçalho
    const [id, name, email, role] = row;
    return { id, name, email, role };
  }).filter(Boolean);
}

// Função para processar ranking de categorias (ajustado para o top 10)
function handleCategoryRanking(rows) {
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1; // Janeiro = 1
  const currentYear = currentDate.getFullYear();

  // Filtrar registros do mês atual
  const currentMonthRows = rows.filter((row, index) => {
    if (index === 0) return false; // Ignorar cabeçalho
    const [dateStr] = row;
    const [day, month, year] = dateStr.split('/').map(Number);
    const date = new Date(year, month - 1, day);
    return date.getMonth() + 1 === currentMonth && date.getFullYear() === currentYear;
  });

  // Contar categorias
  const categoryCounts = currentMonthRows.reduce((acc, row) => {
    const category = row[4]; // Coluna 5 contém o nome da categoria
    if (category) {
      acc[category] = (acc[category] || 0) + 1;
    }
    return acc;
  }, {});

  // Ordenar categorias por contagem e pegar as top 10
  const sortedCategories = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1]) // Ordenar em ordem decrescente pela contagem
    .slice(0, 10) // Pegar apenas os 10 primeiros
    .map(([name, count]) => ({ name, count }));

  return {
    categories: sortedCategories,
  };
}

// Função para processar dados de desempenho
function handlePerformance(rows) {
  return rows.map((row, index) => {
    if (index === 0) return null; // Ignorar cabeçalho
    const [date, tipo, email, tma, csat, perdido] = row;
    return { date, tipo, email, tma, csat, perdido };
  }).filter(Boolean);
}
