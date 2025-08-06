import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Configurar timeout para evitar 504
  const timeout = setTimeout(() => {
    res.status(504).json({ 
      message: 'Timeout - A requisição demorou muito para responder',
      error: 'Request timeout'
    });
  }, 30000); // 30 segundos

  try {
    // Verificar autenticação usando getServerSession
    const session = await getServerSession(req, res, authOptions);
    
    if (!session) {
      clearTimeout(timeout);
      return res.status(401).json({ message: 'Não autorizado' });
    }

    // Garantir que apenas usuários com role "super" ou "quality" possam acessar
    if (session.role !== 'super' && session.role !== 'quality') {
      clearTimeout(timeout);
      return res.status(403).json({ message: 'Permissão negada' });
    }

    // Verificar se a API key está configurada
    if (!process.env.GEMINI_API_KEY) {
      clearTimeout(timeout);
      return res.status(500).json({ 
        message: 'API key do Gemini não configurada',
        error: 'GEMINI_API_KEY não encontrada'
      });
    }

    const { message, topics, period, startDate, endDate, chatHistory } = req.body;

    if (!message) {
      clearTimeout(timeout);
      return res.status(400).json({ message: 'Mensagem é obrigatória' });
    }

    // Importação dinâmica para evitar problemas de SSR
    const { GoogleGenerativeAI } = await import('@google/generative-ai');

    // Preparar contexto com dados do dashboard (limitar a top 15 para evitar timeout)
    const limitedTopics = topics ? topics.slice(0, 15) : [];
    const contextData = limitedTopics.map((topic, index) => ({
      ranking: index + 1,
      name: topic.name,
      count: topic.count,
      percentage: topic.percentage
    }));

    // Construir prompt com contexto
    const systemPrompt = `Você é um assistente especializado em análise de dados de temas de dúvidas para o time de suporte do sistema ERP da Olist.

CONTEXTO DOS DADOS:
- Período: ${period} (${startDate} a ${endDate})
- Total de temas: ${contextData.length}
- Dados dos temas: ${JSON.stringify(contextData, null, 2)}

INSTRUÇÕES:
1. Analise os dados fornecidos sobre temas de dúvidas do sistema ERP
2. Responda em português de forma clara e profissional
3. Forneça insights baseados nos dados quando relevante
4. Sugira ações práticas quando apropriado
5. Mantenha o foco na qualidade do suporte e melhoria de processos

CAPACIDADES:
- Análise de padrões nos dados de suporte
- Identificação de temas críticos que precisam de atenção
- Sugestões de melhorias na documentação do sistema ERP
- Recomendações de treinamentos para a equipe de suporte
- Análise de tendências nos tipos de dúvidas
- Priorização de ações para reduzir volume de tickets

CONTEXTO ESPECÍFICO:
- Sistema ERP da Olist usado por clientes
- Equipe de suporte técnico
- Foco em melhorar experiência do usuário
- Redução de volume de dúvidas recorrentes

Responda de forma útil e acionável, sempre considerando o contexto do sistema ERP da Olist.`;

    // Preparar histórico de conversa
    const conversationHistory = chatHistory ? chatHistory.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.content }]
    })) : [];

    // Adicionar mensagem atual
    conversationHistory.push({
      role: 'user',
      parts: [{ text: message }]
    });

    // Gerar resposta com Gemini (usando modelo gratuito)
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash',
      generationConfig: {
        maxOutputTokens: 1024, // Reduzir tokens para resposta mais rápida
        temperature: 0.7,
      }
    });
    
    try {
      const chat = model.startChat({
        history: conversationHistory.slice(0, -1), // Excluir a mensagem atual do histórico
        generationConfig: {
          maxOutputTokens: 1024,
          temperature: 0.7,
        },
      });

      const result = await chat.sendMessage(systemPrompt + '\n\n' + message);
      const response = await result.response;
      const text = response.text();
      
      clearTimeout(timeout);
      return res.status(200).json({
        success: true,
        response: text,
        metadata: {
          period,
          startDate,
          endDate,
          totalTopics: contextData.length,
          timestamp: new Date().toISOString(),
          note: limitedTopics.length < (topics?.length || 0) ? `Analisados apenas os top ${limitedTopics.length} temas para melhor performance` : null
        }
      });
    } catch (geminiError) {
      clearTimeout(timeout);
      return res.status(500).json({ 
        message: 'Erro ao gerar resposta com Gemini',
        error: geminiError.message 
      });
    }

  } catch (error) {
    clearTimeout(timeout);
    return res.status(500).json({ 
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
} 