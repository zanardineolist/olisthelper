import { batchGetValuesFromSpecificSheet } from '../../utils/googleSheets';

export default async function handler(req, res) {
  try {
    // Verificar se a variável de ambiente da planilha de ocorrências está configurada
    if (!process.env.OCORRENCIAS_SHEET_ID) {
      return res.status(500).json({
        error: 'Variável de ambiente OCORRENCIAS_SHEET_ID não configurada',
        details: 'Configure a variável OCORRENCIAS_SHEET_ID no Vercel com o ID da planilha de ocorrências'
      });
    }
    
    // Definir a página específica para ocorrências
    const targetSheet = 'OCR';
    
    // Preparar range para a página OCR (colunas A até J)
    const ranges = [`${targetSheet}!A:J`];
    
    // Buscar dados da planilha específica de ocorrências
    const results = await batchGetValuesFromSpecificSheet(process.env.OCORRENCIAS_SHEET_ID, ranges);
    
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
        while (paddedRow.length < 10) {
          paddedRow.push('');
        }
        
        return {
          Id: paddedRow[0] || '',                // Coluna A (ID do Slack)
          DataHora: paddedRow[1] || '',          // Coluna B
          Problema: paddedRow[2] || '',          // Coluna C
          // Coluna D ignorada (responsável)
          Resumo: paddedRow[4] || '',            // Coluna E
          Marcadores: paddedRow[5] || '',        // Coluna F
          Modulo: paddedRow[6] || '',            // Coluna G
          Motivo: paddedRow[7] || '',            // Coluna H
          Status: paddedRow[8] || 'Novo',        // Coluna I (default: Novo)
          DataCorrecao: paddedRow[9] || ''       // Coluna J (data correção)
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
    
    // Verificar se é erro de configuração
    if (error.message.includes('OCORRENCIAS_SHEET_ID')) {
      return res.status(500).json({ 
        error: 'Configuração da planilha de ocorrências ausente',
        details: 'Configure a variável OCORRENCIAS_SHEET_ID no Vercel'
      });
    }
    
    res.status(500).json({ 
      error: 'Erro ao obter dados de ocorrências',
      details: error.message 
    });
  }
} 