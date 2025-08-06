import { getSession } from 'next-auth/react';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Usar a mesma conexão do Gemini que já existe no projeto
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Verificar autenticação - mesma abordagem das outras APIs
    const session = await getSession({ req });
    
    if (!session) {
      return res.status(401).json({ message: 'Não autorizado' });
    }

    // Garantir que apenas usuários com role "super" ou "quality" possam acessar
    if (session.role !== 'super' && session.role !== 'quality') {
      return res.status(403).json({ message: 'Permissão negada' });
    }

    const { message, topics, period, startDate, endDate, chatHistory } = req.body;

    // Log para debug
    console.log('Chat API - Session:', session?.user?.email, session?.role);
    console.log('Chat API - Message:', message);
    console.log('Chat API - Topics count:', topics?.length);

    if (!message) {
      return res.status(400).json({ message: 'Mensagem é obrigatória' });
    }

    // Preparar contexto com dados do dashboard
    const contextData = topics ? topics.map((topic, index) => ({
      ranking: index + 1,
      name: topic.name,
      count: topic.count,
      percentage: topic.percentage
    })) : [];

    // Construir prompt com contexto
    const systemPrompt = `Você é um assistente especializado em análise de dados de temas de dúvidas para uma equipe de qualidade.

CONTEXTO DOS DADOS:
- Período: ${period} (${startDate} a ${endDate})
- Total de temas: ${contextData.length}
- Dados dos temas: ${JSON.stringify(contextData, null, 2)}

INSTRUÇÕES:
1. Analise os dados fornecidos sobre temas de dúvidas
2. Responda em português de forma clara e profissional
3. Forneça insights baseados nos dados quando relevante
4. Sugira ações práticas quando apropriado
5. Mantenha o foco na qualidade e melhoria de processos

CAPACIDADES:
- Análise de padrões nos dados
- Identificação de temas críticos
- Sugestões de melhorias na documentação
- Recomendações de treinamentos
- Análise de tendências
- Priorização de ações

Responda de forma útil e acionável.`;

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

    // Gerar resposta com Gemini
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    try {
      const chat = model.startChat({
        history: conversationHistory.slice(0, -1), // Excluir a mensagem atual do histórico
        generationConfig: {
          maxOutputTokens: 2048,
          temperature: 0.7,
        },
      });

      const result = await chat.sendMessage(systemPrompt + '\n\n' + message);
      const response = await result.response;
      const text = response.text();

      console.log('Chat API - Resposta gerada com sucesso');
      
      return res.status(200).json({
        success: true,
        response: text,
        metadata: {
          period,
          startDate,
          endDate,
          totalTopics: contextData.length,
          timestamp: new Date().toISOString()
        }
      });
    } catch (geminiError) {
      console.error('Erro específico do Gemini:', geminiError);
      return res.status(500).json({ 
        message: 'Erro ao gerar resposta com Gemini',
        error: geminiError.message 
      });
    }

  } catch (error) {
    console.error('Erro no chat do Gemini:', error);
    return res.status(500).json({ 
      message: 'Erro interno do servidor',
      error: error.message 
    });
  }
} 