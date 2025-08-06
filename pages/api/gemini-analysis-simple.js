import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';

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

    const { topics, period, startDate, endDate } = req.body;

    if (!topics || !Array.isArray(topics)) {
      return res.status(400).json({ message: 'Dados de temas são obrigatórios' });
    }

    // Importação dinâmica para evitar problemas de SSR
    const { GoogleGenerativeAI } = await import('@google/generative-ai');

    // Preparar dados para análise (apenas top 10 para máxima performance)
    const limitedTopics = topics.slice(0, 10);
    const topicsData = limitedTopics.map((topic, index) => ({
      ranking: index + 1,
      name: topic.name,
      count: topic.count,
      percentage: topic.percentage
    }));

    // Prompt simplificado para análise rápida
    const analysisPrompt = `
      Analise rapidamente os dados de temas de dúvidas do sistema ERP da Olist (${period}: ${startDate} a ${endDate}):
      
      ${JSON.stringify(topicsData, null, 2)}
      
      Forneça uma análise concisa sobre:
      
      ## 1. PRINCIPAIS PADRÕES
      - Identifique os 3 principais padrões nos dados
      
      ## 2. TEMAS CRÍTICOS
      - Liste os temas que precisam de atenção imediata
      
      ## 3. SUGESTÕES RÁPIDAS
      - 3 melhorias principais para documentação
      - 3 treinamentos prioritários
      
      ## 4. AÇÕES IMEDIATAS
      - 3 ações que podem reduzir dúvidas rapidamente
      
      IMPORTANTE:
      - Seja conciso e direto
      - Foque nos pontos mais importantes
      - Responda em português
      - Use formatação markdown simples
    `;

    // Gerar análise com Gemini (configuração otimizada para velocidade)
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash',
      generationConfig: {
        maxOutputTokens: 2048, // Reduzido para máxima velocidade
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
      }
    });
    
    // Timeout mais agressivo
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
          totalTopics: limitedTopics.length,
          analysisType: 'simple',
          note: `Análise simplificada - analisados apenas os top ${limitedTopics.length} temas para máxima performance`,
          tokensUsed: response.usageMetadata?.totalTokenCount || 'N/A'
        }
      });

    } catch (geminiError) {
      clearTimeout(timeoutId);
      
      console.error('Erro do Gemini (versão simples):', geminiError);
      
      let errorMessage = 'Erro ao gerar análise simplificada';
      let errorDetails = geminiError.message;
      
      // Tratar erros específicos do Gemini
      if (geminiError.message.includes('quota')) {
        errorMessage = 'Limite de requisições excedido';
        errorDetails = 'Tente novamente em alguns instantes';
      } else if (geminiError.message.includes('timeout') || geminiError.name === 'AbortError') {
        errorMessage = 'Tempo limite excedido';
        errorDetails = 'Servidor sobrecarregado. Tente novamente mais tarde.';
      } else if (geminiError.message.includes('API key')) {
        errorMessage = 'Erro de configuração da API';
        errorDetails = 'Verifique a configuração da API key do Gemini';
      }
      
      return res.status(500).json({ 
        message: errorMessage,
        error: errorDetails,
        details: process.env.NODE_ENV === 'development' ? geminiError.stack : undefined
      });
    }

  } catch (error) {
    console.error('Erro geral da API (versão simples):', error);
    return res.status(500).json({ 
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
} 