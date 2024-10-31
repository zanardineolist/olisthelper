import { getSheetValues, getSheetMetaData, getAuthenticatedGoogleSheets } from '../../utils/googleSheets';

export default async function handler(req, res) {
  const { userEmail, analystId, infoType } = req.query;

  if (!infoType) {
    return res.status(400).json({ error: 'Parâmetro infoType é obrigatório.' });
  }

  const sheetId = process.env.SHEET_ID;

  try {
    const sheets = await getAuthenticatedGoogleSheets();
    let data;

    switch (infoType) {
      case 'helpRequests':
        data = await processHelpRequests(sheets, sheetId, userEmail, analystId);
        break;
      case 'categoryRanking':
        data = await processCategoryRanking(sheets, sheetId, userEmail, analystId);
        break;
      case 'performance':
        data = await processPerformanceData(sheets, sheetId, userEmail);
        break;
      default:
        return res.status(400).json({ error: 'Tipo de informação inválido.' });
    }

    return res.status(200).json({ data });
  } catch (error) {
    console.error('Erro ao processar a requisição:', error);
    return res.status(500).json({ error: 'Erro ao buscar dados da planilha.' });
  }
}

// Função para processar dados de ajudas solicitadas
async function processHelpRequests(sheets, sheetId, userEmail, analystId) {
  const metaData = await getSheetMetaData(sheetId);

  if (!analystId) {
    throw new Error('ID do analista é obrigatório para a busca de ajudas solicitadas.');
  }

  const sheetName = metaData.sheets.find(sheet => sheet.properties.title.startsWith(`#${analystId}`))?.properties.title;

  if (!sheetName) {
    throw new Error(`A aba correspondente ao ID '${analystId}' não existe na planilha.`);
  }

  const data = await getSheetValues(sheetId, `'${sheetName}'!A:Z`);
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();
  const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
  const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;

  let currentMonthCount = 0;
  let lastMonthCount = 0;

  data.forEach((row, index) => {
    if (index === 0) return;

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

// Função para processar o ranking de categorias (ajustado)
async function processCategoryRanking(sheets, sheetId, userEmail, analystId) {
  const metaData = await getSheetMetaData(sheetId);

  let sheetNames = [];
  if (analystId) {
    // Se for um analista, pegar a aba correspondente ao seu ID
    const sheetName = metaData.sheets.find(sheet => sheet.properties.title.startsWith(`#${analystId}`))?.properties.title;
    if (!sheetName) {
      throw new Error(`A aba correspondente ao ID '${analystId}' não existe na planilha.`);
    }
    sheetNames.push(sheetName);
  } else if (userEmail) {
    // Se for suporte, iterar sobre todas as abas
    sheetNames = metaData.sheets.map(sheet => sheet.properties.title);
  } else {
    throw new Error('ID do analista ou e-mail do usuário é obrigatório.');
  }

  let rows = [];
  for (const sheetName of sheetNames) {
    const response = await getSheetValues(sheetId, `'${sheetName}'!A:F`);
    rows = rows.concat(response);
  }

  if (!rows || rows.length === 0) {
    return { categories: [] };
  }

  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  const currentMonthRows = rows.filter((row, index) => {
    if (index === 0) return false;
    const [dateStr, , , email, category] = row;

    if (userEmail && email !== userEmail) return false;

    const [day, month, year] = dateStr.split('/').map(Number);
    const date = new Date(year, month - 1, day);

    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  });

  const categoryCounts = currentMonthRows.reduce((acc, row) => {
    const category = row[4];
    if (category) {
      acc[category] = (acc[category] || 0) + 1;
    }
    return acc;
  }, {});

  const sortedCategories = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));

  return {
    categories: sortedCategories,
  };
}

// Função para processar dados de desempenho
async function processPerformanceData(sheets, sheetId, userEmail) {
    if (!userEmail) {
      throw new Error('O e-mail do usuário é obrigatório para processar os dados de desempenho.');
    }
  
    const data = await getSheetValues(sheetId, `'Principal'!A:V`);
    const userRows = data.filter((row) => row[2]?.toLowerCase() === userEmail.toLowerCase());
  
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
      const [dateStr, tipo, , , tmaStr, csatStr] = row;
  
      // Conversão de TMA e CSAT para números
      const tma = parseFloat(tmaStr);
      const csat = parseFloat(csatStr);
  
      switch (tipo) {
        case 'Chamado':
          totalChamados++;
          tmaTotalChamados += isNaN(tma) ? 0 : tma;
          if (!isNaN(csat)) {
            csatTotalChamados += csat;
            csatCountChamados++;
          }
          break;
  
        case 'Telefone':
          totalTelefone++;
          tmaTotalTelefone += isNaN(tma) ? 0 : tma;
          if (!isNaN(csat)) {
            csatTotalTelefone += csat;
            csatCountTelefone++;
          }
          break;
  
        case 'Chat':
          totalChats++;
          tmaTotalChat += isNaN(tma) ? 0 : tma;
          if (!isNaN(csat)) {
            csatTotalChat += csat;
            csatCountChat++;
          }
          break;
  
        default:
          break;
      }
    });
  
    // Calcular TMA e CSAT
    const tmaChamados = totalChamados > 0 ? (tmaTotalChamados / totalChamados).toFixed(2) : 'N/A';
    const tmaTelefone = totalTelefone > 0 ? (tmaTotalTelefone / totalTelefone).toFixed(2) : 'N/A';
    const tmaChat = totalChats > 0 ? (tmaTotalChat / totalChats).toFixed(2) : 'N/A';
  
    const csatChamados = csatCountChamados > 0 ? (csatTotalChamados / csatCountChamados).toFixed(2) + '%' : 'N/A';
    const csatTelefone = csatCountTelefone > 0 ? (csatTotalTelefone / csatCountTelefone).toFixed(2) + '%' : 'N/A';
    const csatChat = csatCountChat > 0 ? (csatTotalChat / csatCountChat).toFixed(2) + '%' : 'N/A';
  
    // Montar a resposta completa de desempenho
    return {
      chamados: {
        total: totalChamados,
        tma: tmaChamados,
        csat: csatChamados,
      },
      telefone: {
        total: totalTelefone,
        tma: tmaTelefone,
        csat: csatTelefone,
      },
      chat: {
        total: totalChats,
        tma: tmaChat,
        csat: csatChat,
      },
      squad: userRows[0][4] || 'N/A', // Campo adicional que pode estar na planilha
      atualizadoAte: userRows[0][21] || 'Data não disponível', // Data de atualização
    };
  }  

// Funções auxiliares de formatação e parsing
function parseValue(value) {
  if (typeof value === 'string') {
    if (value.includes('%')) {
      return parseFloat(value.replace('%', '').replace(',', '.'));
    } else if (value.includes(':')) {
      const parts = value.split(':');
      return parseInt(parts[0]) * 60 + parseInt(parts[1]) + parseInt(parts[2]) / 60;
    } else if (value === '-') {
      return null;
    }
    return parseFloat(value.replace(',', '.'));
  }
  return value;
}

function formatTime(minutes) {
  if (minutes === null) {
    return '-';
  }
  const hours = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);
  const secs = Math.round((minutes % 1) * 60);
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function formatHours(value) {
  if (value === null) {
    return '-';
  }
  return `${value}h`;
}
