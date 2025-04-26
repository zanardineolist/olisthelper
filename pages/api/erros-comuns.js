import { getAuthenticatedGoogleSheets, batchGetValues } from '../../utils/googleSheets';

export default async function handler(req, res) {
  try {
    // Usar o método batchGet para evitar problemas com caracteres especiais nas abas
    const ranges = [
      'Anúncios!A:G',
      'Expedição!A:G', 
      'Notas Fiscais!A:F'
    ];
    
    const results = await batchGetValues(ranges);
    
    // Preparar os dados dos anúncios
    const anunciosHeaders = results[0].values[0];
    const anunciosData = results[0].values.slice(1).map(row => {
      const item = {};
      anunciosHeaders.forEach((header, index) => {
        item[header] = row[index] || '';
      });
      return item;
    }).filter(item => item.Revisado === 'TRUE');

    // Preparar os dados da expedição
    const expedicaoHeaders = results[1].values[0];
    const expedicaoData = results[1].values.slice(1).map(row => {
      const item = {};
      expedicaoHeaders.forEach((header, index) => {
        item[header] = row[index] || '';
      });
      return item;
    }).filter(item => item.Revisado === 'TRUE');

    // Preparar os dados das notas fiscais
    const notasFiscaisHeaders = results[2].values[0];
    const notasFiscaisData = results[2].values.slice(1).map(row => {
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