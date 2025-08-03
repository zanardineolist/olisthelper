import { batchGetValuesFromSpecificSheet } from '../../../utils/googleSheets';

export default async function handler(req, res) {
  const { id } = req.query;
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  if (!id) {
    return res.status(400).json({ error: 'ID da ocorrência é obrigatório' });
  }

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
      return res.status(404).json({
        error: 'Ocorrência não encontrada',
        details: 'Nenhum dado foi encontrado na planilha'
      });
    }
    
    const sheetData = results[0].values;
    
    // Pular se não houver dados ou apenas o cabeçalho
    if (sheetData.length <= 1) {
      return res.status(404).json({
        error: 'Ocorrência não encontrada',
        details: 'Planilha não contém dados'
      });
    }
    
    // Procurar a ocorrência específica pelo ID
    const targetRow = sheetData.slice(1).find(row => {
      return row[0] && row[0].toString().trim() === id.toString().trim();
    });
    
    if (!targetRow) {
      return res.status(404).json({
        error: 'Ocorrência não encontrada',
        details: `Nenhuma ocorrência foi encontrada com o ID: ${id}`
      });
    }
    
    // Estender o array para ter o tamanho adequado se necessário
    const paddedRow = [...targetRow];
    while (paddedRow.length < 10) {
      paddedRow.push('');
    }
    
    // Mapear para o formato padronizado
    const ocorrencia = {
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
    
    // Verificar se tem um problema definido
    if (!ocorrencia.Problema.trim()) {
      return res.status(404).json({
        error: 'Ocorrência não encontrada',
        details: 'A ocorrência encontrada não possui um problema definido'
      });
    }
    
    // Retornar a ocorrência encontrada
    res.status(200).json({
      ocorrencia,
      id: id
    });
  } catch (error) {
    console.error('Erro ao obter ocorrência específica:', error);
    
    // Verificar se é erro de configuração
    if (error.message.includes('OCORRENCIAS_SHEET_ID')) {
      return res.status(500).json({ 
        error: 'Configuração da planilha de ocorrências ausente',
        details: 'Configure a variável OCORRENCIAS_SHEET_ID no Vercel'
      });
    }
    
    res.status(500).json({ 
      error: 'Erro ao obter ocorrência específica',
      details: error.message 
    });
  }
}