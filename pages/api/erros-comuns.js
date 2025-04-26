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
    
    // Preparar os dados dos anúncios (mapeamento direto com as colunas identificadas)
    const anunciosHeaders = results[0].values[0];
    const anunciosData = results[0].values.slice(1)
      .filter(row => row.length >= 7) // Garantir que a linha tem dados até a coluna G
      .map(row => {
        return {
          Integração: row[0] || '',         // Coluna A
          Tipo: row[1] || '',               // Coluna B
          Erro: row[2] || '',               // Coluna C
          Solução: row[3] || '',            // Coluna D
          Observação: row[4] || '',         // Coluna E
          'Sugestões de melhoria': row[5] || '', // Coluna F
          Revisado: row[6] || 'FALSE'       // Coluna G
        };
      });

    // Preparar os dados da expedição (mapeamento direto com as colunas identificadas)
    const expedicaoHeaders = results[1].values[0];
    const expedicaoData = results[1].values.slice(1)
      .filter(row => row.length >= 7) // Garantir que a linha tem dados até a coluna G
      .map(row => {
        return {
          Logística: row[0] || '',          // Coluna A
          Tipo: row[1] || '',               // Coluna B
          Erro: row[2] || '',               // Coluna C  
          Solução: row[3] || '',            // Coluna D
          Observação: row[4] || '',         // Coluna E
          'Sugestões de melhoria': row[5] || '', // Coluna F
          Revisado: row[6] || 'FALSE'       // Coluna G
        };
      });

    // Preparar os dados das notas fiscais (mapeamento direto com as colunas identificadas)
    const notasFiscaisHeaders = results[2].values[0];
    const notasFiscaisData = results[2].values.slice(1)
      .filter(row => row.length >= 6) // Garantir que a linha tem dados até a coluna F
      .map(row => {
        return {
          Erro: row[0] || '',               // Coluna A
          Tipo: row[1] || '',               // Coluna B
          Solução: row[2] || '',            // Coluna C
          Observação: row[3] || '',         // Coluna D
          'Sugestão de melhoria': row[4] || '', // Coluna E
          Revisado: row[5] || 'FALSE'       // Coluna F
        };
      });

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