import { getSheetValues, getSheetMetaData } from '../../utils/googleSheets';

export default async function handler(req, res) {
  const { analystId, infoType } = req.query;

  if (!analystId || !infoType) {
    return res.status(400).json({ error: 'Parâmetros analystId e infoType são obrigatórios.' });
  }

  const sheetId = process.env.SHEET_ID;

  try {
    // Buscar metadados da planilha para confirmar se a aba existe
    const metaData = await getSheetMetaData(sheetId);
    if (!metaData.sheets) {
      console.error('Erro ao buscar metadados: sheets não encontrado.');
      return res.status(404).json({ error: 'Metadados da planilha não encontrados.' });
    }

    // Buscar a aba que começa com o ID do analista (por exemplo, "#8487")
    const sheetName = metaData.sheets.find(sheet => sheet.properties.title.startsWith(`#${analystId}`))?.properties.title;

    if (!sheetName) {
      console.error(`Erro: A aba correspondente ao ID '${analystId}' não existe na planilha.`);
      return res.status(404).json({ error: `A aba correspondente ao ID '${analystId}' não existe na planilha.` });
    }

    const range = `'${sheetName}'!A:Z`;
    const data = await getSheetValues(sheetId, range);

    if (!data || data.length === 0) {
      return res.status(200).json({ data: [] });
    }

    let result;
    switch (infoType) {
      case 'helpRequests':
        result = processHelpRequests(data);
        break;
      case 'categoryRanking':
        result = processCategoryRanking(data);
        break;
      case 'performance':
        result = processPerformanceData(data, req.query.userEmail);
        break;
      default:
        return res.status(400).json({ error: 'Tipo de informação inválido.' });
    }

    return res.status(200).json({ data: result });
  } catch (error) {
    console.error('Erro ao processar a requisição:', error);
    return res.status(500).json({ error: 'Erro ao buscar dados da planilha.' });
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

// Função para processar o ranking de categorias (ajustado)
function processCategoryRanking(data) {
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1; // Janeiro = 1
  const currentYear = currentDate.getFullYear();

  // Filtrar registros do mês atual
  const currentMonthRows = data.filter((row, index) => {
    if (index === 0) return false; // Ignorar o cabeçalho

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

// Função expandida para processar dados de desempenho
function processPerformanceData(data, userEmail) {
  if (!userEmail) {
    throw new Error("O e-mail do usuário é obrigatório para processar os dados de desempenho.");
  }

  // Filtrar registros do usuário especificado pelo e-mail
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
    const [dateStr, tipo, , , tmaStr, csatStr] = row;

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

  // Calcular TMA e CSAT
  const tmaChamados = totalChamados > 0 ? (tmaTotalChamados / totalChamados).toFixed(2) : 'N/A';
  const tmaTelefone = totalTelefone > 0 ? (tmaTotalTelefone / totalTelefone).toFixed(2) : 'N/A';
  const tmaChat = totalChats > 0 ? (tmaTotalChat / totalChats).toFixed(2) : 'N/A';

  const csatChamados = csatCountChamados > 0 ? (csatTotalChamados / csatCountChamados).toFixed(2) + '%' : 'N/A';
  const csatTelefone = csatCountTelefone > 0 ? (csatTotalTelefone / csatCountTelefone).toFixed(2) + '%' : 'N/A';
  const csatChat = csatCountChat > 0 ? (csatTotalChat / csatCountChat).toFixed(2) + '%' : 'N/A';

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
  };
}
