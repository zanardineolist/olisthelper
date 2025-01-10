// pages/api/get-analyst-records.js
import { getAuthenticatedGoogleSheets, getSheetMetaData, getSheetValues } from '../../utils/googleSheets';

export default async function handler(req, res) {
  const { analystId, mode, filter } = req.query;

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
      return res.status(200).json({ count: 0, rows: [] });
    }

    console.log(`Total de registros encontrados: ${rows.length}`);

    // Filtrar registros para o perfil do analista (current month e last month)
    if (mode === 'profile') {
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
    }

    // Lógica padrão (com filtro para registros gerais)
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
  } catch (error) {
    console.error('Erro ao obter registros do analista:', error);
    res.status(500).json({ error: 'Erro ao obter registros.' });
  }
}