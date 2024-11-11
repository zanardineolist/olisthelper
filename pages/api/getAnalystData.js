// pages/api/getAnalystData.js
import { getAuthenticatedGoogleSheets, getSheetMetaData, getSheetValues } from '../../utils/googleSheets';

export default async function handler(req, res) {
  const { analystId, dataType, mode = 'general', filter = 30 } = req.query;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!analystId) {
    return res.status(400).json({ error: 'Analyst ID is required.' });
  }

  try {
    const sheets = await getAuthenticatedGoogleSheets();
    const sheetMeta = await getSheetMetaData();
    const sheetNames = sheetMeta.data.sheets.map(sheet => sheet.properties.title);

    let result;

    switch (dataType) {
      case 'leaderboard':
        result = await getAnalystLeaderboard(sheets, analystId, sheetNames, filter);
        break;
      case 'records':
        result = await getAnalystRecords(sheets, analystId, sheetNames, mode, filter);
        break;
      case 'categories':
        result = await getAnalystCategories(sheets, sheetNames);
        break;
      case 'ranking':
        result = await getCategoryRanking(sheets, analystId);
        break;
      case 'analysts':
        result = await getAnalystsAndCategories(sheets);
        break;
      default:
        return res.status(400).json({ error: 'Invalid data type requested.' });
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching analyst data:', error);
    return res.status(500).json({ error: 'Error fetching analyst data.' });
  }
}

// Funções auxiliares

async function getAnalystLeaderboard(sheets, analystId, sheetNames, filter) {
  try {
    const sheetName = sheetNames.find(name => name.startsWith(`#${analystId}`));
    if (!sheetName) {
      console.error(`Erro: A aba correspondente ao ID '${analystId}' não existe na planilha.`);
      return { error: `A aba correspondente ao ID '${analystId}' não existe na planilha.` };
    }

    console.log(`Aba localizada: ${sheetName}`);

    const rows = await getSheetValues(sheets, process.env.SHEET_ID, sheetName, 'A:F');
    if (!rows || rows.length === 0) {
      console.warn('Nenhum registro encontrado na aba especificada.');
      return { rows: [] };
    }

    console.log(`Total de registros encontrados: ${rows.length}`);

    // Filtrar registros com base no filtro (sempre o mês atual ou customizado)
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    const filteredRows = rows.filter((row, index) => {
      if (index === 0) return false; // Ignorar o cabeçalho

      const [dateStr] = row;
      const [day, month, year] = dateStr.split('/').map(Number);
      const date = new Date(year, month - 1, day);

      return date.getFullYear() === currentYear && date.getMonth() === currentMonth;
    });

    console.log(`Total de registros filtrados: ${filteredRows.length}`);

    const leaderboardData = filteredRows.map(row => {
      const [date, entry, details, analystName, category, score] = row;
      return {
        date,
        entry,
        details,
        analystName,
        category,
        score: Number(score) || 0,
      };
    });

    leaderboardData.sort((a, b) => b.score - a.score);

    console.log('Dados do leaderboard processados:', leaderboardData);

    return { leaderboard: leaderboardData };
  } catch (error) {
    console.error('Erro ao obter leaderboard do analista:', error);
    return { error: 'Erro ao obter leaderboard do analista.' };
  }
}

async function getAnalystRecords(sheets, analystId, sheetNames, mode, filterDays) {
  try {
    const sheetName = sheetNames.find(name => name.startsWith(`#${analystId}`));
    if (!sheetName) {
      console.error(`Erro: A aba correspondente ao ID '${analystId}' não existe na planilha.`);
      return { error: `A aba correspondente ao ID '${analystId}' não existe na planilha.` };
    }

    console.log(`Aba localizada: ${sheetName}`);

    const rows = await getSheetValues(sheets, process.env.SHEET_ID, sheetName, 'A:F');
    if (!rows || rows.length === 0) {
      console.warn('Nenhum registro encontrado na aba especificada.');
      return { records: [] };
    }

    console.log(`Total de registros encontrados: ${rows.length}`);

    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();
    const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;

    let filteredRecords = [];

    if (mode === 'profile') {
      let currentMonthCount = 0;
      let lastMonthCount = 0;

      rows.forEach((row, index) => {
        if (index === 0) return;

        const [dateStr] = row;
        const [day, month, year] = dateStr.split('/').map(Number);

        if (year === currentYear && month === currentMonth) {
          currentMonthCount++;
        } else if (year === lastMonthYear && month === lastMonth) {
          lastMonthCount++;
        }
      });

      filteredRecords = {
        currentMonthCount,
        lastMonthCount,
        records: rows.slice(1),
      };

      console.log(`Registros do perfil: mês atual = ${currentMonthCount}, mês anterior = ${lastMonthCount}`);
    } else {
      const brtDate = new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" });
      const referenceDate = new Date(brtDate);

      filteredRecords = rows.filter((row, index) => {
        if (index === 0) return false;

        const [dateStr] = row;
        const [day, month, year] = dateStr.split('/').map(Number);
        const date = new Date(year, month - 1, day);

        const diffTime = referenceDate - date;
        const diffDays = diffTime / (1000 * 60 * 60 * 24);

        return diffDays <= filterDays;
      });

      const count = filteredRecords.length;
      const dates = filteredRecords.map((row) => row[0]);
      const countsObj = dates.reduce((acc, date) => {
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {});

      console.log(`Total de registros após o filtro aplicado: ${filteredRecords.length}`);

      filteredRecords = {
        count,
        dates: Object.keys(countsObj),
        counts: Object.values(countsObj),
        rows: filteredRecords,
      };
    }

    return { records: filteredRecords };
  } catch (error) {
    console.error('Erro ao obter registros do analista:', error);
    return { error: 'Erro ao obter registros do analista.' };
  }
}

async function getAnalystCategories(sheets, sheetNames) {
  try {
    const categoriesSheet = sheetNames.find(name => name === 'Categorias');
    if (!categoriesSheet) {
      console.error(`Erro: A aba 'Categorias' não existe na planilha.`);
      return { error: `A aba 'Categorias' não existe na planilha.` };
    }

    console.log(`Aba 'Categorias' localizada: ${categoriesSheet}`);

    const categoriesResponse = await getSheetValues(sheets, process.env.SHEET_ID, categoriesSheet, 'A2:A');
    if (!categoriesResponse || categoriesResponse.length === 0) {
      console.warn('Nenhuma categoria encontrada na aba especificada.');
      return { categories: [] };
    }

    const categories = categoriesResponse.flat().filter(category => category.trim() !== '');

    console.log(`Total de categorias encontradas: ${categories.length}`);

    return { categories };
  } catch (error) {
    console.error('Erro ao obter categorias dos analistas:', error);
    return { error: 'Erro ao obter categorias dos analistas.' };
  }
}

async function getCategoryRanking(sheets, analystId) {
  try {
    const sheetMeta = await getSheetMetaData();
    const sheetNames = sheetMeta.data.sheets.map(sheet => sheet.properties.title);

    const sheetName = sheetNames.find(name => name.startsWith(`#${analystId}`));
    if (!sheetName) {
      console.error(`Erro: A aba correspondente ao ID '${analystId}' não existe na planilha.`);
      return { error: `A aba correspondente ao ID '${analystId}' não existe na planilha.` };
    }

    console.log(`Aba localizada: ${sheetName}`);

    const rows = await getSheetValues(sheets, process.env.SHEET_ID, sheetName, 'A:F');
    if (!rows || rows.length === 0) {
      console.warn('Nenhum registro encontrado na aba especificada.');
      return { categories: [] };
    }

    console.log(`Total de registros encontrados: ${rows.length}`);

    const currentDate = new Date();
    const brtDate = new Date(currentDate.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    const currentMonth = brtDate.getMonth();
    const currentYear = brtDate.getFullYear();

    const currentMonthRows = rows.filter((row, index) => {
      if (index === 0) return false;

      const [dateStr] = row;
      const [day, month, year] = dateStr.split('/').map(Number);
      const date = new Date(year, month - 1, day);

      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });

    console.log(`Total de registros do mês atual encontrados: ${currentMonthRows.length}`);

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

    console.log('Categorias no ranking:', sortedCategories);

    return { categories: sortedCategories };
  } catch (error) {
    console.error('Erro ao obter ranking de categorias:', error);
    return { error: 'Erro ao obter ranking de categorias.' };
  }
}

async function getAnalystsAndCategories(sheets) {
  try {
    const categoriesResponse = await getSheetValues(sheets, process.env.SHEET_ID, 'Categorias', 'A2:A');
    const categories = categoriesResponse.flat();

    const rows = await getSheetValues(sheets, process.env.SHEET_ID, 'Usuários', 'A:D');
    const analysts = rows
      .filter((row) => row[3] === 'analyst')
      .map((row) => ({
        id: row[0],
        name: row[1],
      }));

    return { analysts, categories };
  } catch (error) {
    console.error('Erro ao obter analistas e categorias:', error);
    return { error: 'Erro ao carregar dados.' };
  }
}
