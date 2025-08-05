import { getSession } from 'next-auth/react';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Inicializar o Gemini - mesma conexão usada no SharedMessages
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Verificar autenticação
    const session = await getSession({ req });
    
    if (!session) {
      return res.status(401).json({ message: 'Não autorizado' });
    }

    // Garantir que apenas usuários com role "super" ou "quality" possam acessar
    if (session.role !== 'super' && session.role !== 'quality') {
      return res.status(403).json({ message: 'Permissão negada' });
    }

    const { topics, period, startDate, endDate, analysisType } = req.body;

    if (!topics || !Array.isArray(topics)) {
      return res.status(400).json({ message: 'Dados de temas são obrigatórios' });
    }

    // Preparar dados para análise
    const topicsData = topics.map((topic, index) => ({
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

    // Gerar análise com Gemini
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    
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

    return res.status(200).json({
      success: true,
      analysis: parsedResponse,
      metadata: {
        period,
        startDate,
        endDate,
        totalTopics: topics.length,
        analysisType
      }
    });

  } catch (error) {
    console.error('Erro na análise do Gemini:', error);
    return res.status(500).json({ 
      message: 'Erro interno do servidor',
      error: error.message 
    });
  }
} 