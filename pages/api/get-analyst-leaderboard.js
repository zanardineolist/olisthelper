// pages/api/get-analyst-leaderboard.js
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
      return res.status(200).json({ rows: [] });
    }

    console.log(`Total de registros encontrados: ${rows.length}`);

    // Filtrar registros com base no filtro de data (sempre o mês atual)
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
  } catch (error) {
    console.error('Erro ao obter registros do analista:', error);
    res.status(500).json({ error: 'Erro ao obter registros.' });
  }
}
