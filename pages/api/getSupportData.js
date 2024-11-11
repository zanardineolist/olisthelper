// pages/api/getSupportData.js
import { getAuthenticatedGoogleSheets, getSheetMetaData, getSheetValues } from '../../utils/googleSheets';

export default async function handler(req, res) {
  const { userEmail, include } = req.query;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!userEmail) {
    return res.status(400).json({ error: 'User email is required.' });
  }

  try {
    const sheets = await getAuthenticatedGoogleSheets();
    const sheetMeta = await getSheetMetaData();
    const sheetNames = sheetMeta.data.sheets.map(sheet => sheet.properties.title);

    const results = {};

    // Coletar diferentes dados de acordo com o que foi solicitado
    const userPromises = [];

    if (include.includes('performance')) {
      userPromises.push(getUserPerformance(sheets, userEmail));
    }
    if (include.includes('ranking')) {
      userPromises.push(getUserCategoryRanking(sheets, userEmail, sheetNames));
    }
    if (include.includes('helpRequests')) {
      userPromises.push(getUserHelpRequests(sheets, userEmail, sheetNames));
    }

    const [performanceData, categoryRanking, helpRequests] = await Promise.all(userPromises);

    if (performanceData) {
      results.performance = performanceData;
    }
    if (categoryRanking) {
      results.categoryRanking = categoryRanking;
    }
    if (helpRequests) {
      results.helpRequests = helpRequests;
    }

    return res.status(200).json(results);
  } catch (error) {
    console.error('Error fetching support data:', error);
    return res.status(500).json({ error: 'Error fetching support data.' });
  }
}

// Funções auxiliares
import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 3600 }); // Cache com TTL de 1 hora

async function getUserPerformance(sheets, userEmail) {
  // Verificar se há cache disponível
  const cacheKey = `userPerformance-${userEmail}`;
  const cachedData = cache.get(cacheKey);
  if (cachedData) {
    console.log('Cache encontrado para desempenho do usuário.');
    return cachedData;
  }

  try {
    const sheetIdUsuarios = process.env.SHEET_ID_USUARIOS;
    const sheetIdDesempenho = process.env.SHEET_ID_DESEMPENHO;

    // Buscar Nome do Usuário e Preferências Usando o E-mail
    const usersRows = await getSheetValues(sheets, sheetIdUsuarios, 'Usuários', 'A:H');
    if (!usersRows || usersRows.length === 0) {
      throw new Error('Nenhum usuário encontrado.');
    }

    const userRow = usersRows.find(row => row[2]?.toLowerCase() === userEmail.toLowerCase());
    if (!userRow) {
      throw new Error('Usuário não encontrado.');
    }

    const userProfile = userRow[3]?.toLowerCase();
    if (userProfile !== 'support') {
      throw new Error('Usuário não autorizado a visualizar os dados de desempenho.');
    }

    const squad = userRow[4];
    const hasChamado = userRow[5] === 'TRUE';
    const hasTelefone = userRow[6] === 'TRUE';
    const hasChat = userRow[7] === 'TRUE';

    // Buscar Dados de Desempenho Usando o E-mail do Usuário
    const performanceRows = await getSheetValues(sheets, sheetIdDesempenho, 'Principal', 'A:V');
    if (!performanceRows || performanceRows.length === 0) {
      throw new Error('Nenhum dado de desempenho encontrado.');
    }

    const performanceRow = performanceRows.find(row => row[0]?.toLowerCase() === userEmail.toLowerCase());
    if (!performanceRow) {
      throw new Error('Nenhum dado de desempenho encontrado para o e-mail fornecido.');
    }

    const responsePayload = {
      squad,
      chamado: hasChamado,
      telefone: hasTelefone,
      chat: hasChat,
    };

    if (hasChamado) {
      const mediaPorDia = parseValue(performanceRow[9]);
      const tma = parseValue(performanceRow[10]);
      const csat = parseValue(performanceRow[11]);

      responsePayload.chamados = {
        totalChamados: performanceRow[8],
        mediaPorDia,
        tma: formatHours(tma),
        csat,
        colors: {
          mediaPorDia: getColorForValue(mediaPorDia, 25),
          tma: getColorForValue(tma, 30, false),
          csat: getColorForValue(csat, 95),
        }
      };
    }

    if (hasTelefone) {
      const tma = parseValue(performanceRow[14]);
      const csat = parseValue(performanceRow[15]);

      responsePayload.telefone = {
        totalTelefone: performanceRow[12],
        mediaPorDia: parseValue(performanceRow[13]),
        tma: formatTime(tma),
        csat,
        perdidas: parseValue(performanceRow[16]),
        colors: {
          tma: getColorForValue(tma, 15, false),
          csat: getColorForValue(csat, 3.7),
        }
      };
    }

    if (hasChat) {
      const tma = parseValue(performanceRow[19]);
      const csat = parseValue(performanceRow[20]);

      responsePayload.chat = {
        totalChats: performanceRow[17],
        mediaPorDia: parseValue(performanceRow[18]),
        tma: tma !== null ? formatTime(tma) : "-",
        csat: csat !== null ? csat : "-",
        colors: {
          tma: getColorForValue(tma, 20, false),
          csat: getColorForValue(csat, 95),
        }
      };
    }

    responsePayload.atualizadoAte = performanceRow[21] || "Data não disponível";

    // Armazenar os resultados no cache
    cache.set(cacheKey, responsePayload);

    return responsePayload;
  } catch (error) {
    console.error('Erro ao obter dados de desempenho:', error);
    throw new Error('Erro ao obter dados de desempenho.');
  }
}

async function getUserCategoryRanking(sheets, userEmail) {
  // Verificar se há cache disponível
  const cacheKey = `userCategoryRanking-${userEmail}`;
  const cachedData = cache.get(cacheKey);
  if (cachedData) {
    console.log('Cache encontrado para o ranking de categorias do usuário.');
    return cachedData;
  }

  try {
    const sheetMeta = await getSheetMetaData(sheets);
    const sheetNames = sheetMeta.data.sheets.map(sheet => sheet.properties.title);

    let rows = [];

    // Iterar sobre todas as abas para buscar os registros dos analistas
    for (const sheetName of sheetNames) {
      const response = await getSheetValues(sheets, process.env.SHEET_ID, sheetName, 'A:F');
      rows = rows.concat(response);
    }

    if (!rows || rows.length === 0) {
      console.warn('Nenhum registro encontrado nas abas.');
      return { categories: [] };
    }

    console.log(`Total de registros obtidos de todas as abas: ${rows.length}`);

    // Filtrar registros do mês atual e do usuário especificado
    const currentDate = new Date();
    const brtDate = new Date(currentDate.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    const currentMonth = brtDate.getMonth();
    const currentYear = brtDate.getFullYear();

    const currentMonthRows = rows.filter((row, index) => {
      if (index === 0) return false; // Ignorar o cabeçalho
      const [dateStr, , , email] = row;
      if (email !== userEmail) return false;

      const [day, month, year] = dateStr.split('/').map(Number);
      const date = new Date(year, month - 1, day);

      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });

    console.log(`Total de registros do mês atual para o usuário ${userEmail}: ${currentMonthRows.length}`);

    // Contar a quantidade de registros por categoria
    const categoryCounts = currentMonthRows.reduce((acc, row) => {
      const category = row[4]; // Coluna da categoria
      if (category) {
        acc[category] = (acc[category] || 0) + 1;
      }
      return acc;
    }, {});

    // Ordenar as categorias pelo número de ocorrências em ordem decrescente
    const sortedCategories = Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    console.log('Ranking de categorias gerado:', sortedCategories);

    // Armazenar os resultados no cache
    cache.set(cacheKey, sortedCategories);

    return { categories: sortedCategories };
  } catch (error) {
    console.error('Erro ao obter ranking de categorias do usuário:', error);
    throw new Error('Erro ao obter ranking de categorias do usuário.');
  }
}

async function getUserHelpRequests(sheets, userEmail) {
    // Verificar se há cache disponível
    const cacheKey = `userHelpRequests-${userEmail}`;
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      console.log('Cache encontrado para as solicitações de ajuda do usuário.');
      return cachedData;
    }
  
    try {
      const sheetMeta = await getSheetMetaData(sheets);
      const sheetNames = sheetMeta.data.sheets.map(sheet => sheet.properties.title);
      const analystSheetNames = sheetNames.filter(name => name.startsWith('#'));
  
      let currentMonthCount = 0;
      let lastMonthCount = 0;
  
      // Data atual ajustada para o fuso horário BRT
      const today = new Date();
      const brtDate = new Date(today.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
      const currentMonth = brtDate.getMonth();
      const currentYear = brtDate.getFullYear();
  
      // Iterar sobre todas as abas dos analistas para buscar os registros de ajuda
      for (const sheetName of analystSheetNames) {
        const rows = await getSheetValues(sheets, process.env.SHEET_ID, sheetName, 'A:F');
  
        if (rows.length > 0) {
          rows.shift(); // Ignorar o cabeçalho
  
          for (const row of rows) {
            const [dateString, , , email] = row;
  
            if (email === userEmail) {
              const [day, month, year] = dateString.split('/').map(Number);
              const recordDate = new Date(year, month - 1, day);
  
              // Verificar se o registro pertence ao mês atual ou ao anterior
              if (recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear) {
                currentMonthCount++;
              } else if (
                (recordDate.getMonth() === currentMonth - 1 && recordDate.getFullYear() === currentYear) ||
                (currentMonth === 0 && recordDate.getMonth() === 11 && recordDate.getFullYear() === currentYear - 1)
              ) {
                lastMonthCount++;
              }
            }
          }
        }
      }
  
      console.log(`Solicitações de ajuda do mês atual: ${currentMonthCount}, mês anterior: ${lastMonthCount}`);
  
      const helpRequests = {
        currentMonth: currentMonthCount,
        lastMonth: lastMonthCount,
      };
  
      // Armazenar os resultados no cache
      cache.set(cacheKey, helpRequests);
  
      return helpRequests;
    } catch (error) {
      console.error('Erro ao obter solicitações de ajuda do usuário:', error);
      throw new Error('Erro ao obter solicitações de ajuda do usuário.');
    }
  }
