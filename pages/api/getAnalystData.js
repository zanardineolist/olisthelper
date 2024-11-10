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

    // Data atual ajustada para o fuso horário de São Paulo
    const currentDate = new Date();
    const brtDate = new Date(currentDate.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    const currentMonth = brtDate.getMonth() + 1; // Mês atual (1-12)
    const currentYear = brtDate.getFullYear();
    const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1; // Mês anterior
    const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;

    // Filtragem de dados baseada no modo fornecido na requisição
    if (mode === 'profile') {
      // Modo perfil: contar registros do mês atual e do mês anterior
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
      // Modo ranking de categorias: calcular a contagem de categorias auxiliadas no mês atual
      const currentMonthRows = rows.filter((row, index) => {
        if (index === 0) return false; // Pular cabeçalho

        const [dateStr] = row;
        const [day, month, year] = dateStr.split('/').map(Number);
        const date = new Date(year, month - 1, day);

        return date.getMonth() + 1 === currentMonth && date.getFullYear() === currentYear;
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
    } else if (mode === 'help-requests') {
      // Modo pedidos de ajuda: contar pedidos de ajuda do mês atual e do mês anterior
      let currentMonthCount = 0;
      let lastMonthCount = 0;

      rows.forEach((row, index) => {
        if (index === 0) return; // Pular cabeçalho

        const [dateStr] = row;
        const [day, month, year] = dateStr.split('/').map(Number);
        const date = new Date(year, month - 1, day);

        if (date.getFullYear() === currentYear && date.getMonth() + 1 === currentMonth) {
          currentMonthCount++;
        } else if (
          (date.getFullYear() === lastMonthYear && date.getMonth() + 1 === lastMonth) ||
          (currentMonth === 1 && date.getMonth() === 11 && date.getFullYear() === currentYear - 1)
        ) {
          lastMonthCount++;
        }
      });

      return res.status(200).json({
        currentMonth: currentMonthCount,
        lastMonth: lastMonthCount,
      });
    } else {
      return res.status(400).json({ error: 'Modo inválido. Modos suportados: profile, category-ranking, help-requests.' });
    }
  } catch (error) {
    console.error('Erro ao obter dados do analista:', error);
    res.status(500).json({ error: 'Erro ao obter registros.' });
  }
}
