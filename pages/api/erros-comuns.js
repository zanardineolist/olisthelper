import { getAuthenticatedGoogleSheets } from '../../utils/googleSheets';

export default async function handler(req, res) {
  try {
    const sheets = await getAuthenticatedGoogleSheets();
    const sheetId = process.env.SHEET_ID;

    // Buscar dados das três abas de erros comuns
    const [anunciosResponse, expedicaoResponse, notasFiscaisResponse] = await Promise.all([
      sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: 'Database - Erros Comuns - Anúncios!A:G',
      }),
      sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: 'Database - Erros Comuns - Expedição!A:G',
      }),
      sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: 'Database - Erros Comuns - Notas Fiscais!A:F',
      }),
    ]);

    // Preparar os dados dos anúncios
    const anunciosHeaders = anunciosResponse.data.values[0];
    const anunciosData = anunciosResponse.data.values.slice(1).map(row => {
      const item = {};
      anunciosHeaders.forEach((header, index) => {
        item[header] = row[index] || '';
      });
      return item;
    }).filter(item => item.Revisado === 'TRUE');

    // Preparar os dados da expedição
    const expedicaoHeaders = expedicaoResponse.data.values[0];
    const expedicaoData = expedicaoResponse.data.values.slice(1).map(row => {
      const item = {};
      expedicaoHeaders.forEach((header, index) => {
        item[header] = row[index] || '';
      });
      return item;
    }).filter(item => item.Revisado === 'TRUE');

    // Preparar os dados das notas fiscais
    const notasFiscaisHeaders = notasFiscaisResponse.data.values[0];
    const notasFiscaisData = notasFiscaisResponse.data.values.slice(1).map(row => {
      const item = {};
      notasFiscaisHeaders.forEach((header, index) => {
        item[header] = row[index] || '';
      });
      return item;
    }).filter(item => item.Revisado === 'TRUE');

    res.status(200).json({
      anuncios: anunciosData,
      expedicao: expedicaoData,
      notasFiscais: notasFiscaisData,
    });
  } catch (error) {
    console.error('Erro ao obter dados de erros comuns:', error);
    res.status(500).json({ error: 'Erro ao obter dados de erros comuns' });
  }
} 