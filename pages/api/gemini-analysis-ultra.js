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

    // ESTRATÉGIA OTIMIZADA: Top 10 temas com detalhes reduzidos
    const top10Topics = topics.slice(0, 10); // Top 10 temas
    const topicsData = top10Topics.map((topic, index) => ({
      ranking: index + 1,
      name: topic.name,
      count: topic.count,
      percentage: topic.percentage
    }));

    // Coletar detalhes apenas dos top 5 temas (2 registros por tema para otimizar)
    let detailedData = null;
    try {
      const detailsPromises = top10Topics.slice(0, 5).map(async (topic) => {
        try {
          const topicId = topic.id || topic.name;
          const details = await getHelpTopicDetails(topicId, startDate, endDate);
          return {
            topicName: topic.name,
            details: details.slice(0, 2).map(record => ({
              description: record.description?.substring(0, 120) || '', // Reduzir para 120 chars
              date: record.formattedDate,
              analyst: record.analyst_name,
              requester: record.requester_name || 'Usuário não identificado',
              time: record.formattedTime
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

    // Prompt otimizado para top 10 temas
    const analysisPrompt = `
      Analise os dados de temas de dúvidas do sistema ERP da Olist (${period}: ${startDate} a ${endDate}):
      
      TOP 10 TEMAS PRINCIPAIS:
      ${JSON.stringify(topicsData, null, 2)}
      
      ${detailedData ? `
      REGISTROS DE AJUDA (TOP 5 TEMAS COM MAIS DETALHES):
      ${JSON.stringify(detailedData, null, 2)}
      ` : ''}
      
      Forneça uma análise concisa e estruturada:
      
      ## 1. PADRÕES PRINCIPAIS
      - 3 padrões mais relevantes nos temas (top 10)
      - Distribuição percentual dos temas críticos
      
      ## 2. ANÁLISE DOS USUÁRIOS
      - Padrões nas solicitações dos usuários
      - Problemas de usabilidade identificados
      
      ## 3. MELHORIAS SUGERIDAS
      - 3 melhorias para documentação
      - 3 treinamentos prioritários
      
      ## 4. AÇÕES IMEDIATAS
      - 3 ações para reduzir volume de dúvidas
      
      IMPORTANTE:
      - Use formatação markdown
      - Foco no contexto ERP da Olist
      - Seja conciso (máximo 1200 palavras)
      - Responda em português
      - Analise todos os 10 temas principais
    `;

    // Configuração otimizada para limites do Gemini 2.0 Flash
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash',
      generationConfig: {
        maxOutputTokens: 1500, // Reduzido para garantir resposta rápida
        temperature: 0.6, // Reduzido para mais consistência
        topP: 0.8,
        topK: 40,
      }
    });
    
    // Timeout otimizado para 25 segundos (dentro dos limites)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000); // 25 segundos

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
          totalTopics: top10Topics.length,
          analysisType,
          detailsCount: detailedData ? detailedData.reduce((sum, item) => sum + item.details.length, 0) : 0,
          note: `Análise otimizada - top 10 temas com detalhes dos top 5`,
          tokensUsed: response.usageMetadata?.totalTokenCount || 'N/A',
          model: 'gemini-2.0-flash',
          limits: {
            rpm: 15,
            tpm: 1000000,
            rpd: 200
          }
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