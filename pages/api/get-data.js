// pages/api/get-data.js
import { getAuthenticatedGoogleSheets, getSheetMetaData, getSheetValues } from '../../utils/googleSheets';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userEmail, analystId, infoType, filter } = req.query;

  if (!userEmail && !analystId) {
    return res.status(400).json({ error: 'userEmail ou analystId é obrigatório.' });
  }

  try {
    const sheets = await getAuthenticatedGoogleSheets();
    const sheetId = process.env.SHEET_ID;

    // Buscar os metadados da planilha
    const sheetMeta = await getSheetMetaData();

    // Unificar lógica para diferentes tipos de requisição
    switch (infoType) {
      case 'helpRequests':
        return await handleHelpRequests({ userEmail, analystId, sheets, res, sheetMeta });

      case 'categoryRanking':
        return await handleCategoryRanking({ userEmail, analystId, sheets, res, sheetMeta });

      case 'performance':
        return await handlePerformance({ userEmail, sheets, res });

      case 'leaderboard':
        return await handleLeaderboard({ analystId, sheets, res, sheetMeta });

      default:
        return res.status(400).json({ error: 'Tipo de informação inválido.' });
    }
  } catch (error) {
    console.error('Erro ao processar a requisição:', error);
    return res.status(500).json({ error: 'Erro ao processar a requisição. Verifique suas credenciais e a configuração do Google Sheets.' });
  }
}

// Função para tratar pedidos de ajuda dos usuários
async function handleHelpRequests({ userEmail, analystId, sheets, res, sheetMeta }) {
  let sheetName = 'Usuários';

  if (analystId) {
    // Filtrar abas para o analista específico
    sheetName = findSheetByAnalystId(sheetMeta, analystId);
    if (!sheetName) {
      return res.status(400).json({ error: `A aba correspondente ao ID '${analystId}' não existe na planilha.` });
    }
  }

  const rows = await getSheetValues(sheetName, 'A:F');

  if (!rows || rows.length === 0) {
    return res.status(200).json({ currentMonth: 0, lastMonth: 0 });
  }

  // Filtrar registros do mês atual e anterior
  const { currentMonthCount, lastMonthCount } = countHelpRequests(rows);
  return res.status(200).json({ currentMonth: currentMonthCount, lastMonth: lastMonthCount });
}

// Função para tratar ranking de categorias
async function handleCategoryRanking({ userEmail, analystId, sheets, res, sheetMeta }) {
  let sheetName = 'Usuários';

  if (analystId) {
    sheetName = findSheetByAnalystId(sheetMeta, analystId);
    if (!sheetName) {
      return res.status(400).json({ error: `A aba correspondente ao ID '${analystId}' não existe na planilha.` });
    }
  }

  const rows = await getSheetValues(sheetName, 'A:F');

  if (!rows || rows.length === 0) {
    return res.status(200).json({ categories: [] });
  }

  // Filtrar registros do mês atual e contar as categorias
  const categoryCounts = countCategoryRanking(rows);
  return res.status(200).json({ categories: categoryCounts });
}

// Função para tratar dados de performance do usuário
async function handlePerformance({ userEmail, sheets, res }) {
  if (!userEmail) {
    return res.status(400).json({ error: 'O email do usuário é obrigatório para buscar dados de performance.' });
  }

  const rows = await getSheetValues('Usuários', 'A:D');

  if (!rows || rows.length === 0) {
    return res.status(404).json({ error: 'Nenhum dado encontrado para o usuário.' });
  }

  // Buscar informações de desempenho
  const userRow = rows.find(row => row[2] === userEmail);
  if (!userRow) {
    return res.status(404).json({ error: 'Usuário não encontrado.' });
  }

  // Coletar dados específicos de desempenho (ex.: tma, csat, etc.)
  const performanceData = await getPerformanceData(userEmail, sheets);
  return res.status(200).json(performanceData);
}

// Função para tratar leaderboard dos analistas
async function handleLeaderboard({ analystId, sheets, res, sheetMeta }) {
  const sheetName = findSheetByAnalystId(sheetMeta, analystId);
  if (!sheetName) {
    return res.status(400).json({ error: `A aba correspondente ao ID '${analystId}' não existe na planilha.` });
  }

  const rows = await getSheetValues(sheetName, 'A:F');

  if (!rows || rows.length === 0) {
    return res.status(200).json({ rows: [] });
  }

  // Filtrar registros do mês atual
  const leaderboardRows = filterLeaderboard(rows);
  return res.status(200).json({ rows: leaderboardRows });
}

// Funções Auxiliares
function findSheetByAnalystId(sheetMeta, analystId) {
  const sheet = sheetMeta.data.sheets.find((sheet) => {
    return sheet.properties.title.startsWith(`#${analystId}`);
  });
  return sheet?.properties.title;
}

function countHelpRequests(rows) {
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1; // Janeiro = 1
  const currentYear = currentDate.getFullYear();
  const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
  const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;

  let currentMonthCount = 0;
  let lastMonthCount = 0;

  rows.forEach((row, index) => {
    if (index === 0) return; // Pular cabeçalho

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

function countCategoryRanking(rows) {
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  const currentMonthRows = rows.filter((row, index) => {
    if (index === 0) return false; // Pular cabeçalho

    const [dateStr] = row;
    const [day, month, year] = dateStr.split('/').map(Number);
    const date = new Date(year, month - 1, day);

    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  });

  // Contar categorias
  return currentMonthRows.reduce((acc, row) => {
    const category = row[4];
    if (category) {
      acc[category] = (acc[category] || 0) + 1;
    }
    return acc;
  }, {});
}

function filterLeaderboard(rows) {
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  return rows.filter((row, index) => {
    if (index === 0) return false; // Pular cabeçalho

    const [dateStr] = row;
    const [day, month, year] = dateStr.split('/').map(Number);
    const date = new Date(year, month - 1, day);

    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  });
}

// Função para obter os dados de desempenho do usuário
async function getPerformanceData(userEmail, sheets) {
    try {
      // Obter dados da planilha de desempenho
      const performanceRows = await getSheetValues('Desempenho', 'A:F');
  
      if (!performanceRows || performanceRows.length === 0) {
        return { error: 'Nenhum dado de desempenho encontrado.' };
      }
  
      // Filtrar linhas correspondentes ao usuário pelo e-mail
      const userRows = performanceRows.filter((row) => row[2] === userEmail);
  
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
      let chamadasPerdidas = 0;
  
      // Data Atual
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1; // Janeiro = 1
      const currentYear = currentDate.getFullYear();
  
      // Iterar sobre as linhas do usuário para coletar métricas
      userRows.forEach((row) => {
        const [dateStr, tipo, email, tmaStr, csatStr, perdido] = row;
        const [day, month, year] = dateStr.split('/').map(Number);
        const recordDate = new Date(year, month - 1, day);
  
        // Verificar se o registro pertence ao mês e ano atuais
        if (recordDate.getFullYear() === currentYear && recordDate.getMonth() + 1 === currentMonth) {
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
              if (perdido === 'Sim') {
                chamadasPerdidas++;
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
        }
      });
  
      // Cálculo das métricas
      const mediaPorDiaChamados = totalChamados / currentDate.getDate();
      const mediaPorDiaTelefone = totalTelefone / currentDate.getDate();
      const mediaPorDiaChat = totalChats / currentDate.getDate();
  
      const tmaChamados = totalChamados > 0 ? (tmaTotalChamados / totalChamados).toFixed(2) : 'N/A';
      const tmaTelefone = totalTelefone > 0 ? (tmaTotalTelefone / totalTelefone).toFixed(2) : 'N/A';
      const tmaChat = totalChats > 0 ? (tmaTotalChat / totalChats).toFixed(2) : 'N/A';
  
      const csatChamados = csatCountChamados > 0 ? (csatTotalChamados / csatCountChamados).toFixed(2) + '%' : 'N/A';
      const csatTelefone = csatCountTelefone > 0 ? (csatTotalTelefone / csatCountTelefone).toFixed(2) + '%' : 'N/A';
      const csatChat = csatCountChat > 0 ? (csatTotalChat / csatCountChat).toFixed(2) + '%' : 'N/A';
  
      // Retornar os dados de desempenho formatados
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
          mediaPorDia: mediaPorDiaChamados.toFixed(2),
          tma: tmaChamados,
          csat: csatChamados,
        },
        telefone: {
          totalTelefone,
          mediaPorDia: mediaPorDiaTelefone.toFixed(2),
          tma: tmaTelefone,
          csat: csatTelefone,
          perdidas: chamadasPerdidas,
        },
        chat: {
          totalChats,
          mediaPorDia: mediaPorDiaChat.toFixed(2),
          tma: tmaChat,
          csat: csatChat,
        },
      };
    } catch (error) {
      console.error('Erro ao buscar dados de desempenho:', error);
      throw new Error('Erro ao buscar dados de desempenho. Verifique suas credenciais e a configuração do Google Sheets.');
    }
  }  
