import { getAuthenticatedGoogleSheets, getSheetMetaData, getSheetValues } from '../../utils/googleSheets';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { userEmail, dateRange } = req.query;

  if (!userEmail) {
    return res.status(400).json({ error: 'E-mail do usuário é obrigatório.' });
  }

  try {
    // Autenticar e obter metadados da planilha
    const sheets = await getAuthenticatedGoogleSheets();
    const sheetMeta = await getSheetMetaData();

    // Filtrar abas que representam analistas (aquelas que começam com #)
    const analystSheetNames = sheetMeta.data.sheets
      .map(sheet => sheet.properties.title)
      .filter(name => name.startsWith('#'));

    let helpRequests = [];

    // Iterar sobre todas as abas de analistas para obter registros de ajuda
    await Promise.all(
      analystSheetNames.map(async (sheetName) => {
        const rows = await getSheetValues(sheetName, 'A:F');
        if (rows && rows.length > 1) { // Certifique-se de pular o cabeçalho
          rows.slice(1).forEach(row => {
            const [dateString, , , email] = row;
            if (email.toLowerCase() === userEmail.toLowerCase()) {
              helpRequests.push({ dateString, ...formatHelpRequest(row) });
            }
          });
        }
      })
    );

    // Filtrar registros de ajuda por `dateRange` se fornecido
    if (dateRange) {
      helpRequests = filterHelpRequestsByDate(helpRequests, dateRange);
    }

    return res.status(200).json({ helpRequests });
  } catch (error) {
    console.error('Erro ao obter solicitações de ajuda:', error);
    res.status(500).json({ error: 'Erro ao obter solicitações de ajuda.' });
  }
}

// Função para formatar a solicitação de ajuda
function formatHelpRequest(row) {
  const [date, time, userName, userEmail, category, description] = row;
  return { date, time, userName, userEmail, category, description };
}

// Função para filtrar registros de ajuda com base em um intervalo de datas
function filterHelpRequestsByDate(helpRequests, dateRange) {
  const [start, end] = dateRange.split('|');
  const startDate = new Date(start);
  const endDate = new Date(end);

  return helpRequests.filter(request => {
    const [day, month, year] = request.dateString.split('/').map(Number);
    const recordDate = new Date(year, month - 1, day);
    return recordDate >= startDate && recordDate <= endDate;
  });
}
