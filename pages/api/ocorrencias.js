import { getAuthenticatedGoogleSheets, batchGetValues } from '../../utils/googleSheets';

export default async function handler(req, res) {
  try {
    // Definir a página específica para ocorrências
    const targetSheet = 'OCR';
    
    // Preparar range para a página OCR (colunas A até H)
    const ranges = [`${targetSheet}!A:H`];
    
    // Buscar dados da planilha
    const results = await batchGetValues(ranges);
    
    // Verificar se há dados
    if (!results || results.length === 0 || !results[0].values) {
      return res.status(200).json({
        dados: [],
        total: 0
      });
    }
    
    const sheetData = results[0].values;
    
    // Pular se não houver dados ou apenas o cabeçalho
    if (sheetData.length <= 1) {
      return res.status(200).json({
        dados: [],
        total: 0
      });
    }
    
    // Mapear linhas para o formato padronizado
    const ocorrencias = sheetData.slice(1)
      .filter(row => row.length >= 3) // Precisa ter pelo menos as primeiras 3 colunas
      .map(row => {
        // Estender o array para ter o tamanho adequado se necessário
        const paddedRow = [...row];
        while (paddedRow.length < 8) {
          paddedRow.push('');
        }
        
        return {
          DataHora: paddedRow[0] || '',          // Coluna A
          Problema: paddedRow[1] || '',          // Coluna B
          // Coluna C ignorada conforme solicitado
          Resumo: paddedRow[3] || '',            // Coluna D
          Marcadores: paddedRow[4] || '',        // Coluna E
          Modulo: paddedRow[5] || '',            // Coluna F
          Motivo: paddedRow[6] || '',            // Coluna G
          Status: paddedRow[7] || 'Novo'         // Coluna H (default: Novo)
        };
      })
      .filter(item => item.Problema.trim() !== ''); // Filtrar linhas sem problema definido
    
    // Retornar estrutura padronizada
    res.status(200).json({
      dados: ocorrencias,
      total: ocorrencias.length
    });
  } catch (error) {
    console.error('Erro ao obter dados de ocorrências:', error);
    res.status(500).json({ 
      error: 'Erro ao obter dados de ocorrências',
      details: error.message 
    });
  }
} 