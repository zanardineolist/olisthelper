import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    console.log('Chat API - Iniciando...');
    
    // Verificar autenticação usando getServerSession
    const session = await getServerSession(req, res, authOptions);
    
    console.log('Chat API - Session:', session ? 'OK' : 'NÃO AUTORIZADO');
    
    if (!session) {
      return res.status(401).json({ message: 'Não autorizado' });
    }

    // Garantir que apenas usuários com role "super" ou "quality" possam acessar
    if (session.role !== 'super' && session.role !== 'quality') {
      return res.status(403).json({ message: 'Permissão negada' });
    }

    // Verificar se a API key está configurada
    console.log('Chat API - GEMINI_API_KEY configurada:', !!process.env.GEMINI_API_KEY);
    
    if (!process.env.GEMINI_API_KEY) {
      console.error('Chat API - GEMINI_API_KEY não encontrada');
      return res.status(500).json({ 
        message: 'API key do Gemini não configurada',
        error: 'GEMINI_API_KEY não encontrada'
      });
    }

    const { message, topics, period, startDate, endDate, chatHistory } = req.body;

    if (!message) {
      return res.status(400).json({ message: 'Mensagem é obrigatória' });
    }

    console.log('Chat API - Importando GoogleGenerativeAI...');
    
    // Importação dinâmica para evitar problemas de SSR
    const { GoogleGenerativeAI } = await import('@google/generative-ai');

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
    console.log('Chat API - Inicializando Gemini...');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
    
    try {
      console.log('Chat API - Iniciando chat...');
      const chat = model.startChat({
        history: conversationHistory.slice(0, -1), // Excluir a mensagem atual do histórico
        generationConfig: {
          maxOutputTokens: 2048,
          temperature: 0.7,
        },
      });

      console.log('Chat API - Enviando mensagem...');
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
      console.error('Chat API - Erro específico do Gemini:', geminiError);
      return res.status(500).json({ 
        message: 'Erro ao gerar resposta com Gemini',
        error: geminiError.message 
      });
    }

  } catch (error) {
    console.error('Chat API - Erro detalhado:', error);
    console.error('Chat API - Stack trace:', error.stack);
    return res.status(500).json({ 
      message: 'Erro interno do servidor',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
} 