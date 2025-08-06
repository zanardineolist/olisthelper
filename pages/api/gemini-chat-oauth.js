import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    console.log('OAuth API - Iniciando (usando API key padrão)...');
    
    // Verificar autenticação do usuário (usando NextAuth existente)
    const session = await getServerSession(req, res, authOptions);
    
    console.log('OAuth API - Session:', session ? 'OK' : 'NÃO AUTORIZADO');
    
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

    // Verificar se a API key está configurada (OAuth endpoint usa API key padrão)
    console.log('OAuth API - Verificando API key...');
    
    if (!process.env.GEMINI_API_KEY) {
      console.error('OAuth API - GEMINI_API_KEY não encontrada');
      return res.status(500).json({ 
        message: 'API key do Gemini não configurada',
        error: 'GEMINI_API_KEY não encontrada'
      });
    }

    console.log('OAuth API - Importando GoogleGenerativeAI...');
    
    // Importação dinâmica para evitar problemas de SSR
    const { GoogleGenerativeAI } = await import('@google/generative-ai');

    // Inicializar Gemini com API key padrão
    console.log('OAuth API - Inicializando Gemini...');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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

    // Gerar resposta com Gemini (usando modelo gratuito)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    
    try {
      console.log('OAuth API - Gerando conteúdo...');
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
      console.error('OAuth API - Erro específico do Gemini:', geminiError);
      return res.status(500).json({ 
        message: 'Erro ao gerar resposta com Gemini',
        error: geminiError.message 
      });
    }

  } catch (error) {
    console.error('OAuth API - Erro detalhado:', error);
    console.error('OAuth API - Stack trace:', error.stack);
    return res.status(500).json({ 
      message: 'Erro interno do servidor',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
} 