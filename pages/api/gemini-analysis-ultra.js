import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import { getHelpTopicDetails } from '../../utils/supabase/helpQueries';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Verificar autenticação
    const session = await getServerSession(req, res, authOptions);
    
    if (!session) {
      return res.status(401).json({ message: 'Não autorizado' });
    }

    // Garantir que apenas usuários com role "super" ou "quality" possam acessar
    if (session.role !== 'super' && session.role !== 'quality') {
      return res.status(403).json({ message: 'Permissão negada' });
    }

    // Verificar se a API key está configurada
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ 
        message: 'API key do Gemini não configurada',
        error: 'GEMINI_API_KEY não encontrada'
      });
    }

    const { topics, period, startDate, endDate, analysisType } = req.body;

    if (!topics || !Array.isArray(topics)) {
      return res.status(400).json({ message: 'Dados de temas são obrigatórios' });
    }

    // Importação dinâmica para evitar problemas de SSR
    let GoogleGenerativeAI;
    try {
      const module = await import('@google/generative-ai');
      GoogleGenerativeAI = module.GoogleGenerativeAI;
    } catch (importError) {
      console.error('Erro ao importar GoogleGenerativeAI:', importError);
      return res.status(500).json({ 
        message: 'Erro ao carregar biblioteca de IA',
        error: 'Falha na importação do módulo'
      });
    }

    // ULTRA-OTIMIZAÇÃO: Apenas top 3 temas com detalhes
    const top3Topics = topics.slice(0, 3);
    const topicsData = top3Topics.map((topic, index) => ({
      ranking: index + 1,
      name: topic.name,
      count: topic.count,
      percentage: topic.percentage
    }));

    // Coletar detalhes apenas dos top 3 temas (máximo 5 registros cada)
    let detailedData = null;
    try {
      const detailsPromises = top3Topics.map(async (topic) => {
        try {
          const topicId = topic.id || topic.name;
          const details = await getHelpTopicDetails(topicId, startDate, endDate);
          return {
            topicName: topic.name,
            details: details.slice(0, 5).map(record => ({
              description: record.description?.substring(0, 200) || '', // Limitar descrição
              date: record.formattedDate,
              analyst: record.analyst_name
            }))
          };
        } catch (detailError) {
          console.error(`Erro ao buscar detalhes para tema ${topic.name}:`, detailError);
          return {
            topicName: topic.name,
            details: []
          };
        }
      });

      detailedData = await Promise.all(detailsPromises);
    } catch (error) {
      console.error('Erro ao coletar detalhes:', error);
      detailedData = null;
    }

    // Prompt ultra-simplificado
    const analysisPrompt = `
      Analise os dados de temas de dúvidas do sistema ERP da Olist (${period}: ${startDate} a ${endDate}):
      
      TOP 3 TEMAS PRINCIPAIS:
      ${JSON.stringify(topicsData, null, 2)}
      
      ${detailedData ? `
      REGISTROS DE AJUDA (TOP 3 TEMAS):
      ${JSON.stringify(detailedData, null, 2)}
      ` : ''}
      
      Forneça uma análise concisa:
      
      ## 1. PADRÕES PRINCIPAIS
      - 2 principais padrões nos temas de dúvidas
      - Distribuição percentual dos temas críticos
      ${detailedData ? '- Padrões nos registros de ajuda' : ''}
      
      ## 2. CAUSAS DAS DÚVIDAS
      - Por que os temas principais geram mais dúvidas
      - Problemas de usabilidade ou documentação
      ${detailedData ? '- Análise das descrições dos registros' : ''}
      
      ## 3. MELHORIAS SUGERIDAS
      - 2 melhorias principais para documentação
      - 2 treinamentos prioritários
      ${detailedData ? '- Sugestões baseadas nos registros' : ''}
      
      ## 4. AÇÕES IMEDIATAS
      - 2 ações para reduzir volume de dúvidas
      - Melhorias no sistema para problemas recorrentes
      ${detailedData ? '- Ações específicas baseadas nos dados' : ''}
      
      IMPORTANTE:
      - Use formatação markdown
      - Foco no contexto de suporte técnico do ERP da Olist
      - Seja conciso e direto
      - Responda em português
      ${detailedData ? '- Inclua insights dos registros de ajuda' : ''}
    `;

    // Gerar análise com Gemini (configuração ultra-otimizada)
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash',
      generationConfig: {
        maxOutputTokens: 2048, // Ultra-reduzido
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
      }
    });
    
    // Timeout ultra-agressivo
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos

    try {
      const result = await model.generateContent(analysisPrompt);
      clearTimeout(timeoutId);
      
      const response = await result.response;
      const text = response.text();

      return res.status(200).json({
        success: true,
        analysis: text,
        metadata: {
          period,
          startDate,
          endDate,
          totalTopics: top3Topics.length,
          analysisType,
          detailsCount: detailedData ? detailedData.reduce((sum, item) => sum + item.details.length, 0) : 0,
          note: `Análise ultra-otimizada - apenas top 3 temas com detalhes limitados`,
          tokensUsed: response.usageMetadata?.totalTokenCount || 'N/A'
        }
      });

    } catch (geminiError) {
      clearTimeout(timeoutId);
      
      console.error('Erro do Gemini:', geminiError);
      
      let errorMessage = 'Erro ao gerar análise com Gemini';
      let errorDetails = geminiError.message;
      
      // Tratar erros específicos do Gemini
      if (geminiError.message.includes('quota')) {
        errorMessage = 'Limite de requisições excedido';
        errorDetails = 'Tente novamente em alguns instantes';
      } else if (geminiError.message.includes('timeout') || geminiError.name === 'AbortError') {
        errorMessage = 'Tempo limite excedido';
        errorDetails = 'A análise é muito complexa. Tente com período menor.';
      } else if (geminiError.message.includes('API key')) {
        errorMessage = 'Erro de configuração da API';
        errorDetails = 'Verifique a configuração da API key do Gemini';
      } else if (geminiError.message.includes('content policy')) {
        errorMessage = 'Conteúdo não permitido';
        errorDetails = 'Sua solicitação contém conteúdo que não é permitido.';
      }
      
      return res.status(500).json({ 
        message: errorMessage,
        error: errorDetails,
        details: process.env.NODE_ENV === 'development' ? geminiError.stack : undefined
      });
    }

  } catch (error) {
    console.error('Erro geral da API:', error);
    return res.status(500).json({ 
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
} 