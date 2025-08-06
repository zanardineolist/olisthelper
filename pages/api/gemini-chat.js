import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Verificar autenticação usando getServerSession
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

    const { message, topics, period, startDate, endDate, chatHistory } = req.body;

    if (!message) {
      return res.status(400).json({ message: 'Mensagem é obrigatória' });
    }

    // Importação dinâmica para evitar problemas de SSR
    const { GoogleGenerativeAI } = await import('@google/generative-ai');

    // Preparar contexto com dados do dashboard (reduzir para 10 temas para máxima performance)
    const limitedTopics = topics ? topics.slice(0, 10) : [];
    const contextData = limitedTopics.map((topic, index) => ({
      ranking: index + 1,
      name: topic.name,
      count: topic.count,
      percentage: topic.percentage
    }));

    // Construir prompt com contexto mais detalhado
    const systemPrompt = `Você é um assistente especializado em análise de dados de temas de dúvidas para o time de suporte do sistema ERP da Olist.

CONTEXTO DOS DADOS:
- Período: ${period} (${startDate} a ${endDate})
- Total de temas: ${contextData.length}
- Dados dos temas: ${JSON.stringify(contextData, null, 2)}

INSTRUÇÕES:
1. Analise os dados fornecidos sobre temas de dúvidas do sistema ERP
2. Responda em português de forma clara, profissional e DETALHADA
3. Forneça insights baseados nos dados quando relevante
4. Sugira ações práticas quando apropriado
5. Mantenha o foco na qualidade do suporte e melhoria de processos
6. Seja COMPLETO em suas respostas - não corte informações importantes
7. Use formatação markdown quando apropriado para melhor legibilidade

CAPACIDADES:
- Análise de padrões nos dados de suporte
- Identificação de temas críticos que precisam de atenção
- Sugestões de melhorias na documentação do sistema ERP
- Recomendações de treinamentos para a equipe de suporte
- Análise de tendências nos tipos de dúvidas
- Priorização de ações para reduzir volume de tickets
- Análise de causas raiz dos problemas
- Sugestões de melhorias no sistema e processos

CONTEXTO ESPECÍFICO:
- Sistema ERP da Olist usado por clientes
- Equipe de suporte técnico
- Foco em melhorar experiência do usuário
- Redução de volume de dúvidas recorrentes
- Análise de qualidade e eficiência do suporte

DIRETRIZES DE RESPOSTA:
- Seja detalhado e completo em suas análises
- Forneça exemplos específicos quando relevante
- Estruture suas respostas de forma clara e organizada
- Inclua recomendações práticas e acionáveis
- Use dados quantitativos quando disponível
- Mantenha o foco no contexto do sistema ERP da Olist

Responda de forma útil, acionável e COMPLETA, sempre considerando o contexto do sistema ERP da Olist.`;

    // Preparar histórico de conversa (filtrar mensagens válidas e garantir que comece com user)
    let conversationHistory = [];
    
    if (chatHistory && chatHistory.length > 0) {
      // Filtrar mensagens válidas
      const validMessages = chatHistory.filter(msg => msg.role && msg.content && msg.content.trim());
      
      // Garantir que o histórico comece com uma mensagem do usuário
      if (validMessages.length > 0) {
        // Se a primeira mensagem não for do usuário, ignorar o histórico
        if (validMessages[0].role === 'user') {
          conversationHistory = validMessages.map(msg => ({
            role: msg.role,
            parts: [{ text: msg.content.trim() }]
          }));
        }
      }
    }

    // Adicionar mensagem atual
    conversationHistory.push({
      role: 'user',
      parts: [{ text: message.trim() }]
    });

    // Gerar resposta com Gemini (otimizado para máxima performance)
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash',
      generationConfig: {
        maxOutputTokens: 3072, // Reduzido para máxima performance
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
      }
    });
    
    // Configurar timeout mais agressivo
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 35000); // 35 segundos
    
    try {
      const chat = model.startChat({
        history: conversationHistory.slice(0, -1), // Excluir a mensagem atual do histórico
        generationConfig: {
          maxOutputTokens: 3072,
          temperature: 0.7,
          topP: 0.8,
          topK: 40,
        },
      });

      const result = await chat.sendMessage(systemPrompt + '\n\n' + message);
      clearTimeout(timeoutId);
      
      const response = await result.response;
      const text = response.text();
      
      return res.status(200).json({
        success: true,
        response: text,
        metadata: {
          period,
          startDate,
          endDate,
          totalTopics: contextData.length,
          timestamp: new Date().toISOString(),
          note: limitedTopics.length < (topics?.length || 0) ? `Analisados apenas os top ${limitedTopics.length} temas para melhor performance` : null,
          tokensUsed: response.usageMetadata?.totalTokenCount || 'N/A'
        }
      });
      
    } catch (geminiError) {
      clearTimeout(timeoutId);
      
      console.error('Erro do Gemini:', geminiError);
      
      let errorMessage = 'Erro ao gerar resposta com Gemini';
      let errorDetails = geminiError.message;
      
      // Tratar erros específicos do Gemini
      if (geminiError.message.includes('First content should be with role')) {
        errorMessage = 'Erro no histórico de conversa';
        errorDetails = 'Problema com a estrutura do histórico de mensagens';
      } else if (geminiError.message.includes('API key')) {
        errorMessage = 'Erro de configuração da API';
        errorDetails = 'Verifique a configuração da API key do Gemini';
      } else if (geminiError.message.includes('quota')) {
        errorMessage = 'Limite de requisições excedido';
        errorDetails = 'Tente novamente em alguns instantes';
      } else if (geminiError.message.includes('timeout')) {
        errorMessage = 'Tempo limite excedido';
        errorDetails = 'A resposta é muito complexa. Tente reformular sua pergunta.';
      } else if (geminiError.message.includes('content policy')) {
        errorMessage = 'Conteúdo não permitido';
        errorDetails = 'Sua mensagem contém conteúdo que não é permitido.';
      }
      
      return res.status(500).json({ 
        message: errorMessage,
        error: errorDetails,
        details: process.env.NODE_ENV === 'development' ? geminiError.stack : undefined
      });
    }

  } catch (error) {
    console.error('Erro geral do chat:', error);
    return res.status(500).json({ 
      message: 'Erro interno do servidor',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
} 