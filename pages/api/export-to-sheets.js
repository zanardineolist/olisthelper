import { getSession } from 'next-auth/react';
import { GoogleAuth } from 'google-auth-library';
import { GoogleSpreadsheet } from 'google-spreadsheet';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Verificar autenticação
    const session = await getSession({ req });
    
    if (!session) {
      return res.status(401).json({ message: 'Não autorizado' });
    }

    // Garantir que apenas usuários com role "super" ou "quality" possam acessar
    if (session.role !== 'super' && session.role !== 'quality') {
      return res.status(403).json({ message: 'Permissão negada' });
    }

    const { topics, analysis, period, startDate, endDate } = req.body;

    if (!topics || !Array.isArray(topics)) {
      return res.status(400).json({ message: 'Dados de temas são obrigatórios' });
    }

    // Configurar autenticação do Google
    const auth = new GoogleAuth({
      keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY,
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive.file',
      ],
    });

    const client = await auth.getClient();
    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SPREADSHEET_ID, client);
    await doc.loadInfo();

    // Criar nova aba com timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const sheetTitle = `Análise_${period}_${timestamp}`;
    const sheet = await doc.addSheet({ title: sheetTitle });

    // Preparar dados para exportação
    const exportData = [];

    // Cabeçalho
    exportData.push([
      'Ranking',
      'Tema',
      'Quantidade',
      'Porcentagem',
      'Nível de Atenção',
      'Análise'
    ]);

    // Dados dos temas
    topics.forEach((topic, index) => {
      const attention = getAttentionLevel(topic.count);
      exportData.push([
        index + 1,
        topic.name,
        topic.count,
        `${topic.percentage}%`,
        attention.level === 'critical' ? 'Crítico' : 
        attention.level === 'high' ? 'Alto' : 
        attention.level === 'medium' ? 'Médio' : 'Baixo',
        getAnalysisForTopic(topic, attention)
      ]);
    });

    // Adicionar linha em branco
    exportData.push([]);

    // Adicionar resumo
    exportData.push(['RESUMO EXECUTIVO']);
    exportData.push(['Período', `${startDate} a ${endDate}`]);
    exportData.push(['Total de Temas', topics.length]);
    exportData.push(['Tema Mais Frequente', topics[0]?.name || 'N/A']);
    exportData.push(['Quantidade Máxima', topics[0]?.count || 0]);

    // Adicionar linha em branco
    exportData.push([]);

    // Adicionar insights se disponível
    if (analysis && typeof analysis === 'string') {
      exportData.push(['INSIGHTS E RECOMENDAÇÕES']);
      const insights = analysis.split('\n').filter(line => line.trim());
      insights.forEach(insight => {
        exportData.push([insight]);
      });
    }

    // Adicionar dados à planilha
    await sheet.addRows(exportData);

    // Formatar a planilha
    await formatSheet(sheet, exportData.length);

    return res.status(200).json({
      success: true,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${doc.spreadsheetId}/edit#gid=${sheet.sheetId}`,
      sheetTitle,
      message: 'Dados exportados com sucesso para Google Sheets'
    });

  } catch (error) {
    console.error('Erro ao exportar para Google Sheets:', error);
    return res.status(500).json({ 
      message: 'Erro ao exportar para Google Sheets',
      error: error.message 
    });
  }
}

// Função para determinar o nível de atenção
function getAttentionLevel(count) {
  if (count > 50) return { level: 'critical', color: '#E64E36', icon: 'fa-exclamation-triangle' };
  if (count > 30) return { level: 'high', color: '#F0A028', icon: 'fa-exclamation-circle' };
  if (count > 15) return { level: 'medium', color: '#779E3D', icon: 'fa-info-circle' };
  return { level: 'low', color: '#0A4EE4', icon: 'fa-circle-dot' };
}

// Função para gerar análise específica do tema
function getAnalysisForTopic(topic, attention) {
  let analysis = '';
  
  if (attention.level === 'critical') {
    analysis = 'Ação imediata necessária - Criar documentação e treinamento específico';
  } else if (attention.level === 'high') {
    analysis = 'Atenção alta - Considerar melhorias na documentação';
  } else if (attention.level === 'medium') {
    analysis = 'Monitorar - Avaliar necessidade de documentação adicional';
  } else {
    analysis = 'Baixa prioridade - Manter monitoramento';
  }
  
  return analysis;
}

// Função para formatar a planilha
async function formatSheet(sheet, rowCount) {
  try {
    // Formatar cabeçalho
    await sheet.loadCells();
    
    // Aplicar formatação ao cabeçalho (primeira linha)
    for (let col = 0; col < 6; col++) {
      const cell = sheet.getCell(0, col);
      cell.backgroundColor = { red: 0.1, green: 0.3, blue: 0.8 };
      cell.textFormat = { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } };
    }
    
    // Aplicar formatação condicional nas colunas de quantidade
    for (let row = 1; row < rowCount - 10; row++) { // Excluir linhas de resumo
      const quantityCell = sheet.getCell(row, 2);
      const quantity = parseInt(quantityCell.value);
      
      if (quantity > 50) {
        quantityCell.backgroundColor = { red: 0.9, green: 0.3, blue: 0.2 };
      } else if (quantity > 30) {
        quantityCell.backgroundColor = { red: 0.9, green: 0.6, blue: 0.2 };
      } else if (quantity > 15) {
        quantityCell.backgroundColor = { red: 0.5, green: 0.6, blue: 0.2 };
      }
    }
    
    await sheet.saveUpdatedCells();
  } catch (error) {
    console.error('Erro ao formatar planilha:', error);
  }
} 