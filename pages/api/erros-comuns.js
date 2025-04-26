import { getAuthenticatedGoogleSheets, batchGetValues, getAllSheetNames } from '../../utils/googleSheets';

export default async function handler(req, res) {
  try {
    // Obter todas as abas disponíveis na planilha
    const sheetNames = await getAllSheetNames();
    
    // Filtrar abas de sistema ou privadas, se necessário
    // Por exemplo, ignorar abas como "Configurações", "Sistema", etc.
    const excludedSheets = ['Configurações', 'Sistema', 'Usuários'];
    const targetSheets = sheetNames.filter(name => !excludedSheets.includes(name));
    
    // Preparar ranges para todas as abas identificadas
    const ranges = targetSheets.map(sheetName => `${sheetName}!A:G`);
    
    // Buscar dados de todas as abas
    const results = await batchGetValues(ranges);
    
    // Objeto para armazenar os dados de todas as abas
    const sheetData = {};
    
    // Processar cada aba com o novo formato padronizado
    results.forEach((result, index) => {
      const sheetName = targetSheets[index];
      
      // Pular se não houver dados ou apenas o cabeçalho
      if (!result.values || result.values.length <= 1) {
        sheetData[sheetName] = [];
        return;
      }
      
      // Determinar o comprimento máximo esperado (mínimo 7 para incluir a coluna G)
      const maxLength = 7;
      
      // Mapear linhas para o formato padronizado
      const sheetRows = result.values.slice(1)
        .filter(row => row.length >= 3) // Precisa ter pelo menos erro (coluna C)
        .map(row => {
          // Estender o array para ter o tamanho adequado se necessário
          const paddedRow = [...row];
          while (paddedRow.length < maxLength) {
            paddedRow.push('');
          }
          
          return {
            Tag1: paddedRow[0] || '',            // Coluna A (tag1/marcador1)
            Tag2: paddedRow[1] || '',            // Coluna B (tag2/marcador2)
            Erro: paddedRow[2] || '',            // Coluna C (título/erro)
            Solução: paddedRow[3] || '',         // Coluna D (solução)
            Observação: paddedRow[4] || '',      // Coluna E (observações)
            Sugestões: paddedRow[5] || '',       // Coluna F (sugestões)
            Revisado: (paddedRow[6] || 'Não') === 'Sim' ? 'Sim' : 'Não'  // Coluna G (revisado)
          };
        });
      
      // Adicionar dados ao objeto de resposta
      sheetData[sheetName] = sheetRows;
    });
    
    // Retornar estrutura com os dados e metadados
    res.status(200).json({
      abas: targetSheets,
      dados: sheetData
    });
  } catch (error) {
    console.error('Erro ao obter dados de erros comuns:', error);
    res.status(500).json({ error: 'Erro ao obter dados de erros comuns' });
  }
} 