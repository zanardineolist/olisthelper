import { getSheetMetaData, getSheetValues } from '../../utils/batchSheetUtils';

export default async function handler(req, res) {
  const { analystId, mode, filter } = req.query;

  if (!analystId || analystId === 'undefined') {
    console.log('Erro: ID do analista não fornecido ou inválido.');
    return res.status(400).json({ error: 'ID do analista é obrigatório e deve ser válido.' });
  }

  try {
    // Buscar metadados da planilha
    const sheetMeta = await getSheetMetaData();

    // Buscar aba do analista
    const sheetName = sheetMeta.data.sheets.find(sheet => sheet.properties.title.startsWith(`#${analystId}`))?.properties.title;
    if (!sheetName) {
      return res.status(400).json({ error: `A aba correspondente ao ID '${analystId}' não existe na planilha.` });
    }

    console.log(`Aba localizada: ${sheetName}`);

    // Buscar registros do analista
    const rows = await getSheetValues(sheetName, 'A:F');
    if (!rows || rows.length === 0) {
      console.log('Nenhum registro encontrado na aba especificada.');
      return res.status(200).json({ count: 0, rows: [] });
    }

    console.log(`Total de registros encontrados: ${rows.length}`);

    // Filtragem de dados baseada no modo fornecido na requisição
    if (mode === 'profile') {
      // Modo perfil: contar registros do mês atual e anterior (similar ao `get-analyst-records.js`)
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1; // Mês atual (1-12)
      const currentYear = currentDate.getFullYear();
      const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1; // Mês anterior
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

      return res.status(200).json({
        currentMonth: currentMonthCount,
        lastMonth: lastMonthCount,
        rows,
      });
    } else if (mode === 'category-ranking') {
      // Modo ranking de categorias: filtrar registros do mês atual e calcular contagem de categorias (similar ao `get-category-ranking.js`)
      const currentDate = new Date();
      const brtDate = new Date(currentDate.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
      const currentMonth = brtDate.getMonth();
      const currentYear = brtDate.getFullYear();

      const currentMonthRows = rows.filter((row, index) => {
        if (index === 0) return false; // Pular cabeçalho

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

      console.log('Categorias no ranking:', sortedCategories);

      return res.status(200).json({ categories: sortedCategories });
    } else if (mode === 'leaderboard') {
      // Modo leaderboard: obter registros do mês atual para o analista (similar ao `get-analyst-leaderboard.js`)
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();

      const filteredRows = rows.filter((row, index) => {
        if (index === 0) return false; // Pular cabeçalho

        const [dateStr] = row;
        const [day, month, year] = dateStr.split('/').map(Number);
        const date = new Date(year, month - 1, day);

        return date.getFullYear() === currentYear && date.getMonth() === currentMonth;
      });

      console.log(`Total de registros filtrados: ${filteredRows.length}`);

      return res.status(200).json({ rows: filteredRows });
    } else {
      // Lógica padrão para filtrar registros gerais com base no filtro fornecido (similar ao `get-analyst-records.js` com modo padrão)
      const brtDate = new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" });
      const currentDate = new Date(brtDate);

      const filteredRows = rows.filter((row, index) => {
        if (index === 0) return false;

        const [dateStr] = row;
        const [day, month, year] = dateStr.split('/').map(Number);
        const date = new Date(year, month - 1, day);

        const diffTime = currentDate - date;
        const diffDays = diffTime / (1000 * 60 * 60 * 24);

        return diffDays <= (filter ? parseInt(filter, 10) : 30);
      });

      if (!filteredRows || filteredRows.length === 0) {
        console.log('Nenhum registro encontrado após o filtro aplicado.');
        return res.status(200).json({ count: 0, dates: [], counts: [], rows: [] });
      }

      console.log(`Total de registros após o filtro: ${filteredRows.length}`);

      const count = filteredRows.length;
      const dates = filteredRows.map((row) => row[0]);
      const countsObj = dates.reduce((acc, date) => {
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {});

      res.status(200).json({
        count,
        dates: Object.keys(countsObj),
        counts: Object.values(countsObj),
        rows: filteredRows,
      });
    }
  } catch (error) {
    console.error('Erro ao obter dados do analista:', error);
    res.status(500).json({ error: 'Erro ao obter registros.' });
  }
}
