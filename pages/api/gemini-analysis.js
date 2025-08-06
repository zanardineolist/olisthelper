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
  }, 25000); // 25 segundos

  try {
    // Verificar autenticação
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

    const { topics, period, startDate, endDate, analysisType } = req.body;

    if (!topics || !Array.isArray(topics)) {
      clearTimeout(timeout);
      return res.status(400).json({ message: 'Dados de temas são obrigatórios' });
    }

    // Importação dinâmica para evitar problemas de SSR
    const { GoogleGenerativeAI } = await import('@google/generative-ai');

    // Preparar dados para análise (limitar a top 20 para evitar timeout)
    const limitedTopics = topics.slice(0, 20);
    const topicsData = limitedTopics.map((topic, index) => ({
      ranking: index + 1,
      name: topic.name,
      count: topic.count,
      percentage: topic.percentage
    }));

    // Determinar o tipo de análise baseado no parâmetro
    let analysisPrompt = '';
    let responseFormat = '';

    switch (analysisType) {
      case 'insights':
        analysisPrompt = `
          Analise os seguintes dados de temas de dúvidas mais frequentes em um período de ${period} (${startDate} a ${endDate}):
          
          ${JSON.stringify(topicsData, null, 2)}
          
          Forneça insights valiosos sobre:
          1. Padrões identificados nos temas mais frequentes
          2. Possíveis causas raiz das dúvidas
          3. Oportunidades de melhoria na documentação
          4. Sugestões de treinamentos específicos
          5. Priorização de ações baseada na frequência
          
          Responda em português de forma clara e estruturada.
        `;
        responseFormat = 'text';
        break;

      case 'recommendations':
        analysisPrompt = `
          Com base nos dados de temas de dúvidas:
          
          ${JSON.stringify(topicsData, null, 2)}
          
          Gere recomendações específicas e acionáveis:
          1. Materiais de treinamento prioritários
          2. Melhorias na documentação
          3. Processos que podem ser otimizados
          4. Ferramentas ou recursos que podem ajudar
          5. Métricas de acompanhamento
          
          Formate como uma lista estruturada em português.
        `;
        responseFormat = 'text';
        break;

      case 'google_sheets':
        analysisPrompt = `
          Analise os dados de temas de dúvidas e crie um relatório estruturado para Google Sheets:
          
          ${JSON.stringify(topicsData, null, 2)}
          
          Crie um relatório com as seguintes abas:
          1. "Resumo Executivo" - Principais insights e métricas
          2. "Análise Detalhada" - Dados completos com análises
          3. "Recomendações" - Ações sugeridas com prioridade
          4. "Tendências" - Análise temporal e padrões
          5. "Métricas" - KPIs e indicadores de performance
          
          Para cada aba, forneça:
          - Estrutura de colunas
          - Dados formatados
          - Fórmulas relevantes
          - Gráficos sugeridos
          
          Responda em formato JSON com a estrutura das abas e dados.
        `;
        responseFormat = 'json';
        break;

      default:
        return res.status(400).json({ message: 'Tipo de análise inválido' });
    }

    // Gerar análise com Gemini (usando modelo gratuito)
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash',
      generationConfig: {
        maxOutputTokens: 1024, // Reduzir tokens para resposta mais rápida
        temperature: 0.7,
      }
    });
    
    const result = await model.generateContent(analysisPrompt);
    const response = await result.response;
    const text = response.text();

    let parsedResponse;
    if (responseFormat === 'json') {
      try {
        parsedResponse = JSON.parse(text);
      } catch (error) {
        // Se não conseguir fazer parse do JSON, retornar como texto
        parsedResponse = {
          error: 'Erro ao processar resposta JSON',
          rawResponse: text
        };
      }
    } else {
      parsedResponse = text;
    }

    clearTimeout(timeout);
    return res.status(200).json({
      success: true,
      analysis: parsedResponse,
      metadata: {
        period,
        startDate,
        endDate,
        totalTopics: limitedTopics.length,
        analysisType,
        note: limitedTopics.length < topics.length ? `Analisados apenas os top ${limitedTopics.length} temas para melhor performance` : null
      }
    });

  } catch (error) {
    clearTimeout(timeout);
    return res.status(500).json({ 
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
} 