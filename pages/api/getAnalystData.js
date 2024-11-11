import { getAuthenticatedGoogleSheets, getSheetValues, getSheetMetaData } from '../../utils/googleSheets';
import { cache, CACHE_TIMES } from '../../utils/cache';

export default async function handler(req, res) {
  const { analystId, userEmail, includeLeaderboard, includeCategoryRanking, filterPeriod } = req.query;

  if (!analystId && !userEmail) {
    return res.status(400).json({ error: 'ID do analista ou e-mail do usuário é obrigatório' });
  }

  try {
    const cacheKey = `analyst_data_${analystId || userEmail}`;
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      return res.status(200).json(cachedData);
    }

    // Autenticar e obter Google Sheets
    const sheets = await getAuthenticatedGoogleSheets();
    const sheetId = process.env.SHEET_ID;

    // Obter metadados da planilha
    const sheetMeta = await getSheetMetaData();
    const sheetNames = sheetMeta.data.sheets.map(sheet => sheet.properties.title);
    const analystSheetNames = sheetNames.filter(name => name.startsWith('#'));

    let resultData = {};

    // Obter dados de ajudas solicitadas (mês atual e mês anterior) para um usuário específico
    if (userEmail) {
      let currentMonthCount = 0;
      let lastMonthCount = 0;

      const today = new Date();
      const brtDate = new Date(today.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
      const currentMonth = brtDate.getMonth();
      const currentYear = brtDate.getFullYear();

      for (const sheetName of analystSheetNames) {
        const rows = await getSheetValues(sheets, sheetId, sheetName, 'A:F');

        if (rows.length > 0) {
          rows.shift(); // Ignorar cabeçalho

          for (const row of rows) {
            const [dateString, , , email] = row;

            if (email === userEmail) {
              const [day, month, year] = dateString.split('/').map(Number);
              const recordDate = new Date(year, month - 1, day);

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

      resultData.helpRequests = {
        currentMonth: currentMonthCount,
        lastMonth: lastMonthCount,
      };
    }

    // Obter leaderboard dos usuários que mais solicitaram ajuda
    if (includeLeaderboard === 'true') {
      const leaderboardData = {};

      for (const sheetName of analystSheetNames) {
        const rows = await getSheetValues(sheets, sheetId, sheetName, 'A:F');
        if (rows && rows.length > 0) {
          rows.shift(); // Ignorar cabeçalho
          rows.forEach(row => {
            const userName = row[2];
            if (userName) {
              leaderboardData[userName] = (leaderboardData[userName] || 0) + 1;
            }
          });
        }
      }

      const sortedLeaderboard = Object.entries(leaderboardData)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }));

      resultData.leaderboard = sortedLeaderboard;
    }

    // Obter ranking de categorias para o analista
    if (includeCategoryRanking === 'true' && analystId) {
      const sheetName = sheetMeta.data.sheets.find(sheet => sheet.properties.title.startsWith(`#${analystId}`))?.properties.title;

      if (!sheetName) {
        return res.status(400).json({ error: `A aba correspondente ao ID '${analystId}' não existe na planilha.` });
      }

      const rows = await getSheetValues(sheets, sheetId, sheetName, 'A:F');
      if (rows && rows.length > 0) {
        rows.shift(); // Ignorar cabeçalho

        const currentDate = new Date();
        const brtDate = new Date(currentDate.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
        const currentMonth = brtDate.getMonth();
        const currentYear = brtDate.getFullYear();

        const currentMonthRows = rows.filter((row) => {
          const [dateStr] = row;
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

        resultData.categoryRanking = sortedCategories;
      }
    }

    // Filtrar registros por período, se solicitado
    if (filterPeriod) {
      const filteredRows = [];

      for (const sheetName of analystSheetNames) {
        const rows = await getSheetValues(sheets, sheetId, sheetName, 'A:F');
        if (rows && rows.length > 0) {
          rows.shift(); // Ignorar cabeçalho
          rows.forEach(row => {
            const [dateString] = row;
            const [day, month, year] = dateString.split('/').map(Number);
            const recordDate = new Date(year, month - 1, day);

            const diffTime = new Date() - recordDate;
            const diffDays = diffTime / (1000 * 60 * 60 * 24);

            if (diffDays <= parseInt(filterPeriod, 10)) {
              filteredRows.push(row);
            }
          });
        }
      }

      resultData.filteredRecords = filteredRows;
    }

    // Armazenar os dados no cache
    cache.set(cacheKey, resultData, CACHE_TIMES.USERS);

    return res.status(200).json(resultData);
  } catch (error) {
    console.error('Erro ao obter dados do analista/tax:', error);
    return res.status(500).json({ error: 'Erro ao obter dados do analista/tax.' });
  }
}
