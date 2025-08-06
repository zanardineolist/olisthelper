import { getSession } from 'next-auth/react';
import { GoogleAuth } from 'google-auth-library';
import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Verificar autenticação do usuário (usando NextAuth existente)
    const session = await getSession({ req });
    
    console.log('OAuth API - Session:', session);
    
    if (!session) {
      return res.status(401).json({ message: 'Não autorizado' });
    }

    // Garantir que apenas usuários com role "super" ou "quality" possam acessar
    if (session.role !== 'super' && session.role !== 'quality') {
      return res.status(403).json({ message: 'Permissão negada' });
    }

    const { message, topics, period, startDate, endDate, chatHistory } = req.body;

    if (!message) {
      return res.status(400).json({ message: 'Mensagem é obrigatória' });
    }

    // Configurar autenticação específica para o Gemini
    const auth = new GoogleAuth({
      credentials: {
        client_email: process.env.GEMINI_CLIENT_EMAIL,
        private_key: process.env.GEMINI_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        client_id: process.env.GEMINI_CLIENT_ID,
        client_secret: process.env.GEMINI_CLIENT_SECRET,
      },
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });

    // Obter token de acesso
    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();

    // Inicializar Gemini com token de acesso
    const genAI = new GoogleGenerativeAI(accessToken.token);

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

    // Gerar resposta com Gemini
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    try {
      const result = await model.generateContent(systemPrompt + '\n\n' + message);
      const response = await result.response;
      const text = response.text();

      console.log('OAuth API - Resposta gerada com sucesso');
      
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
    console.error('Erro no chat OAuth:', error);
    return res.status(500).json({ 
      message: 'Erro interno do servidor',
      error: error.message 
    });
  }
} 