import { getAuthenticatedGoogleSheets, getSheetValues, getSheetMetaData } from '../../utils/googleSheets';

export default async function handler(req, res) {
  const { type, userEmail, analystId, dateRange, filter } = req.query;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  if (!type || !userEmail) {
    return res.status(400).json({ error: 'Parâmetros obrigatórios faltando (type, userEmail).' });
  }

  try {
    const sheets = await getAuthenticatedGoogleSheets();
    const sheetMeta = await getSheetMetaData();
    let responsePayload = {};

    switch (type) {
      case 'performance':
        responsePayload = await getUserPerformance(sheets, userEmail);
        break;
      case 'leaderboard':
        if (!analystId) {
          return res.status(400).json({ error: 'ID do analista é obrigatório para o leaderboard.' });
        }
        responsePayload = await getAnalystLeaderboard(sheets, analystId, dateRange);
        break;
      case 'records':
        if (!analystId) {
          return res.status(400).json({ error: 'ID do analista é obrigatório para os registros.' });
        }
        responsePayload = await getAnalystRecords(sheets, analystId, dateRange, filter);
        break;
      case 'helpRequests':
        responsePayload = await getUserHelpRequests(sheets, userEmail, dateRange);
        break;
      case 'categoryRanking':
        responsePayload = await getUserCategoryRanking(sheets, userEmail, dateRange);
        break;
      default:
        return res.status(400).json({ error: 'Tipo de dados inválido.' });
    }

    return res.status(200).json(responsePayload);
  } catch (error) {
    console.error('Erro ao processar solicitação:', error);
    return res.status(500).json({ error: 'Erro ao processar solicitação.' });
  }
}

// Função para obter os dados de desempenho do usuário
async function getUserPerformance(sheets, userEmail) {
  const sheetId = process.env.SHEET_ID_PERFORMANCE;
  const rows = await getSheetValues(sheets, 'Desempenho', 'A:U');

  const userRow = rows.find(row => row[0]?.toLowerCase() === userEmail.toLowerCase());
  if (!userRow) {
    throw new Error('Usuário não encontrado na planilha de desempenho.');
  }

  // Aqui você pode criar o objeto de retorno contendo as informações de desempenho necessárias
  return {
    email: userEmail,
    desempenho: userRow,
  };
}

// Função para obter o leaderboard do analista
async function getAnalystLeaderboard(sheets, analystId, dateRange) {
  const sheetMeta = await getSheetMetaData();
  const sheetName = sheetMeta.data.sheets.find(sheet => sheet.properties.title.startsWith(`#${analystId}`))?.properties.title;

  if (!sheetName) {
    throw new Error(`A aba correspondente ao ID '${analystId}' não existe na planilha.`);
  }

  const rows = await getSheetValues(sheetName, 'A:F');
  return {
    leaderboard: rows,
  };
}

// Função para obter registros detalhados de um analista
async function getAnalystRecords(sheets, analystId, dateRange, filter) {
  const sheetMeta = await getSheetMetaData();
  const sheetName = sheetMeta.data.sheets.find(sheet => sheet.properties.title.startsWith(`#${analystId}`))?.properties.title;

  if (!sheetName) {
    throw new Error(`A aba correspondente ao ID '${analystId}' não existe na planilha.`);
  }

  const rows = await getSheetValues(sheetName, 'A:F');
  return {
    records: rows,
  };
}

// Função para obter as solicitações de ajuda do usuário
async function getUserHelpRequests(sheets, userEmail, dateRange) {
  const sheetMeta = await getSheetMetaData();
  const sheetNames = sheetMeta.data.sheets.map(sheet => sheet.properties.title);

  let helpRequests = [];

  for (const sheetName of sheetNames) {
    const rows = await getSheetValues(sheetName, 'A:F');
    helpRequests = helpRequests.concat(rows.filter(row => row[3] === userEmail));
  }

  return {
    helpRequests,
  };
}

// Função para obter o ranking das categorias de um usuário
async function getUserCategoryRanking(sheets, userEmail, dateRange) {
  const sheetMeta = await getSheetMetaData();
  const sheetNames = sheetMeta.data.sheets.map(sheet => sheet.properties.title);

  let rows = [];

  for (const sheetName of sheetNames) {
    rows = rows.concat(await getSheetValues(sheetName, 'A:F'));
  }

  const currentMonthRows = rows.filter(row => row[3] === userEmail);
  return {
    categoryRanking: currentMonthRows,
  };
}
