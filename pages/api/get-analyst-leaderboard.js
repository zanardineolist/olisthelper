// pages/api/get-analyst-records.js
import { getAuthenticatedGoogleSheets, getSheetMetaData, getSheetValues } from '../../utils/googleSheets';

export default async function handler(req, res) {
  const { analystId, filter } = req.query;

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
      return res.status(200).json({ count: 0, dates: [], counts: [], rows: [] });
    }

    console.log(`Total de registros encontrados: ${rows.length}`);

    // Ajustando a data e o horário com base no horário de Brasília
    const brtDate = new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" });
    const currentDate = new Date(brtDate);
    currentDate.setHours(23, 59, 59, 999); // Ajustar para o final do dia

    let startDate;

    // Definir a data de início com base no filtro
    if (filter === '1') {
      // Hoje
      startDate = new Date(currentDate);
      startDate.setHours(0, 0, 0, 0); // Ajustar para o início do dia
    } else if (filter === '7') {
      // Últimos 7 dias
      startDate = new Date(currentDate);
      startDate.setDate(currentDate.getDate() - 6); // Inclui o dia atual, totalizando 7 dias
      startDate.setHours(0, 0, 0, 0);
    } else if (filter === '30') {
      // Últimos 30 dias
      startDate = new Date(currentDate);
      startDate.setDate(currentDate.getDate() - 29); // Inclui o dia atual, totalizando 30 dias
      startDate.setHours(0, 0, 0, 0);
    } else {
      console.log('Filtro inválido.');
      return res.status(400).json({ error: 'Filtro inválido.' });
    }

    // Filtrar registros com base nas datas
    const filteredRows = rows.filter((row, index) => {
      if (index === 0) return false; // Pular cabeçalho

      const [dateStr] = row;
      const [day, month, year] = dateStr.split('/').map(Number);
      const recordDate = new Date(year, month - 1, day);

      return recordDate >= startDate && recordDate <= currentDate;
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
