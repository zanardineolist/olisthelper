// utils/googleSheets.js
import { google } from 'googleapis';

export async function getAuthenticatedGoogleSheets() {
  try {
    const auth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
    const authClient = await auth.getClient();
    return google.sheets({ version: 'v4', auth: authClient });
  } catch (error) {
    console.error('Erro ao autenticar com o Google Sheets:', error);
    return null;
  }
}

export async function getSheetMetaData(sheetId) {
  try {
    const sheets = await getAuthenticatedGoogleSheets();
    if (!sheets) {
      console.error('Erro ao autenticar Google Sheets API para obter metadados.');
      return null;
    }

    const response = await sheets.spreadsheets.get({
      spreadsheetId: sheetId,
    });

    if (!response || !response.data) {
      console.error('Erro ao obter resposta válida da API do Google Sheets para metadados.');
      return null;
    }

    return response.data;
  } catch (error) {
    console.error('Erro ao obter metadados da planilha:', error);
    return null;
  }
}

export async function getSheetValues(sheetId, range) {
  try {
    const sheets = await getAuthenticatedGoogleSheets();
    if (!sheets) {
      console.error('Erro ao autenticar Google Sheets API para obter valores.');
      return null;
    }

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: range,
    });

    if (!response || !response.data || !response.data.values) {
      console.warn(`Nenhum valor encontrado para o range: ${range} na planilha: ${sheetId}`);
      return [];
    }

    return response.data.values;
  } catch (error) {
    console.error(`Erro ao obter valores da aba com range: ${range} da planilha: ${sheetId}`, error);
    return null;
  }
}

// Função para processar dados de ajudas solicitadas
function processHelpRequests(data) {
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1; // Janeiro = 1
  const currentYear = currentDate.getFullYear();
  const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
  const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;

  let currentMonthCount = 0;
  let lastMonthCount = 0;

  data.forEach((row, index) => {
    if (index === 0) return; // Ignorar o cabeçalho

    const [dateStr] = row;
    const [day, month, year] = dateStr.split('/').map(Number);

    if (year === currentYear && month === currentMonth) {
      currentMonthCount++;
    } else if (year === lastMonthYear && month === lastMonth) {
      lastMonthCount++;
    }
  });

  return {
    currentMonth: currentMonthCount,
    lastMonth: lastMonthCount,
  };
}

// Função para processar o ranking de categorias
function processCategoryRanking(data) {
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1; // Janeiro = 1
  const currentYear = currentDate.getFullYear();

  const currentMonthRows = data.filter((row, index) => {
    if (index === 0) return false; // Ignorar o cabeçalho

    const [dateStr] = row;
    const [day, month, year] = dateStr.split('/').map(Number);
    const date = new Date(year, month - 1, day);

    return date.getMonth() + 1 === currentMonth && date.getFullYear() === currentYear;
  });

  // Contar categorias
  const categoryCounts = currentMonthRows.reduce((acc, row) => {
    const category = row[4];
    if (category) {
      acc[category] = (acc[category] || 0) + 1;
    }
    return acc;
  }, {});

  // Transformar em array de objetos para exibição
  return {
    categories: Object.entries(categoryCounts).map(([name, count]) => ({ name, count })),
  };
}

// Função para processar os dados de desempenho
function processPerformanceData(data, userEmail) {
  const userRows = data.filter((row) => row[2] === userEmail);

  if (userRows.length === 0) {
    return { error: 'Dados de desempenho não encontrados para o usuário.' };
  }

  // Inicializar variáveis para armazenar dados de desempenho
  let totalChamados = 0;
  let totalTelefone = 0;
  let totalChats = 0;
  let tmaTotalChamados = 0;
  let tmaTotalTelefone = 0;
  let tmaTotalChat = 0;
  let csatTotalChamados = 0;
  let csatTotalTelefone = 0;
  let csatTotalChat = 0;
  let csatCountChamados = 0;
  let csatCountTelefone = 0;
  let csatCountChat = 0;

  userRows.forEach((row) => {
    const [dateStr, tipo, email, tmaStr, csatStr] = row;

    // Conversão de TMA e CSAT para números
    const tma = parseFloat(tmaStr);
    const csat = parseFloat(csatStr);

    switch (tipo) {
      case 'Chamado':
        totalChamados++;
        tmaTotalChamados += tma;
        if (!isNaN(csat)) {
          csatTotalChamados += csat;
          csatCountChamados++;
        }
        break;

      case 'Telefone':
        totalTelefone++;
        tmaTotalTelefone += tma;
        if (!isNaN(csat)) {
          csatTotalTelefone += csat;
          csatCountTelefone++;
        }
        break;

      case 'Chat':
        totalChats++;
        tmaTotalChat += tma;
        if (!isNaN(csat)) {
          csatTotalChat += csat;
          csatCountChat++;
        }
        break;

      default:
        break;
    }
  });

  const tmaChamados = totalChamados > 0 ? (tmaTotalChamados / totalChamados).toFixed(2) : 'N/A';
  const tmaTelefone = totalTelefone > 0 ? (tmaTotalTelefone / totalTelefone).toFixed(2) : 'N/A';
  const tmaChat = totalChats > 0 ? (tmaTotalChat / totalChats).toFixed(2) : 'N/A';

  const csatChamados = csatCountChamados > 0 ? (csatTotalChamados / csatCountChamados).toFixed(2) + '%' : 'N/A';
  const csatTelefone = csatCountTelefone > 0 ? (csatTotalTelefone / csatCountTelefone).toFixed(2) + '%' : 'N/A';
  const csatChat = csatCountChat > 0 ? (csatTotalChat / csatCountChat).toFixed(2) + '%' : 'N/A';

  return {
    tma: {
      chamados: tmaChamados,
      telefone: tmaTelefone,
      chat: tmaChat,
    },
    csat: {
      chamados: csatChamados,
      telefone: csatTelefone,
      chat: csatChat,
    },
    chamados: {
      totalChamados,
      tma: tmaChamados,
      csat: csatChamados,
    },
    telefone: {
      totalTelefone,
      tma: tmaTelefone,
      csat: csatTelefone,
    },
    chat: {
      totalChats,
      tma: tmaChat,
      csat: csatChat,
    },
  };
}
