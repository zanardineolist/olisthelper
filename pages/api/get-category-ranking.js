import { getAuthenticatedGoogleSheets, getSheetMetaData, getSheetValues } from '../../utils/googleSheets';

export default async function handler(req, res) {
  const { analystId } = req.query;

  if (!analystId || analystId === 'undefined') {
    console.log('Erro: ID do analista não fornecido ou inválido.');
    return res.status(400).json({ error: 'ID do analista é obrigatório e deve ser válido.' });
  }

  try {
    const sheets = await getAuthenticatedGoogleSheets();
    const sheetId = process.env.SHEET_ID;

    console.log(`Buscando metadados da planilha com ID: ${sheetId} para o analista: ${analystId}`);

    // Obter as informações da planilha (metadados)
    const sheetMeta = await getSheetMetaData();

    // Buscar a aba que começa com o ID do analista (por exemplo, "#8487")
    const sheetName = sheetMeta.data.sheets.find((sheet) => {
      return sheet.properties.title.startsWith(`#${analystId}`);
    })?.properties.title;

    if (!sheetName) {
      console.log(`Erro: A aba correspondente ao ID '${analystId}' não existe na planilha.`);
      return res.status(400).json({ error: `A aba correspondente ao ID '${analystId}' não existe na planilha.` });
    }

    console.log(`Aba localizada: ${sheetName}`);

    // Caso a aba seja encontrada, prosseguir para obter os valores
    const rows = await getSheetValues(sheetName, 'A:F');

    if (!rows || rows.length === 0) {
      console.log('Nenhum registro encontrado na aba especificada.');
      return res.status(200).json({ rows: [] });
    }

    console.log(`Total de registros encontrados: ${rows.length}`);

    // Filtrar todos os registros do mês atual para o ranking das categorias
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

    // Contar categorias
    const categoryCounts = currentMonthRows.reduce((acc, row) => {
      const category = row[4];

      if (category) {
        acc[category] = (acc[category] || 0) + 1;
      }

      return acc;
    }, {});

    // Ordenar e pegar as top 10 categorias
    const sortedCategories = Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    console.log('Categorias no ranking:', sortedCategories);

    return res.status(200).json({ categories: sortedCategories });
  } catch (error) {
    console.error('Erro ao obter registros das categorias:', error);
    res.status(500).json({ error: 'Erro ao obter registros das categorias.' });
  }
}