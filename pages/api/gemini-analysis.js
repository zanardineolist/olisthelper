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

    const { topics, period, startDate, endDate, analysisType } = req.body;

    if (!topics || !Array.isArray(topics)) {
      return res.status(400).json({ message: 'Dados de temas são obrigatórios' });
    }

    // Importação dinâmica para evitar problemas de SSR
    const { GoogleGenerativeAI } = await import('@google/generative-ai');

    // Preparar dados para análise (reduzir para 15 temas para melhor performance)
    const limitedTopics = topics.slice(0, 15);
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
          Analise os dados de temas de dúvidas do sistema ERP da Olist (${period}: ${startDate} a ${endDate}):
          
          ${JSON.stringify(topicsData, null, 2)}
          
          Forneça uma análise estruturada sobre:
          
          ## 1. PADRÕES IDENTIFICADOS
          - Principais padrões nos temas de dúvidas
          - Distribuição percentual dos temas
          - Temas relacionados que indicam problemas sistêmicos
          
          ## 2. CAUSAS RAIZ DAS DÚVIDAS
          - Por que esses temas geram mais dúvidas
          - Problemas de usabilidade, documentação ou complexidade
          - Fatores como mudanças no sistema, treinamento da equipe
          
          ## 3. MELHORIAS NA DOCUMENTAÇÃO
          - Sugestões específicas para documentação do sistema ERP
          - Seções que precisam ser expandidas ou criadas
          - Exemplos práticos que podem ser adicionados
          
          ## 4. TREINAMENTOS ESPECÍFICOS
          - Treinamentos focados nos temas problemáticos
          - Materiais de apoio para a equipe de suporte
          - Workshops práticos para temas críticos
          
          ## 5. AÇÕES PRIORITÁRIAS
          - Ações para reduzir volume de dúvidas
          - Melhorias no sistema para resolver problemas recorrentes
          - Processos de acompanhamento para medir impacto
          
          IMPORTANTE:
          - Use formatação markdown
          - Foco no contexto de suporte técnico do ERP da Olist
          - Insights acionáveis e práticos
          - Responda em português de forma clara
          - Seja detalhado mas conciso
        `;
        responseFormat = 'text';
        break;

      case 'recommendations':
        analysisPrompt = `
          Com base nos dados de temas de dúvidas do sistema ERP da Olist:
          
          ${JSON.stringify(topicsData, null, 2)}
          
          Gere recomendações específicas estruturadas:
          
          ## 1. MATERIAIS DE TREINAMENTO
          - Temas que precisam de treinamento urgente
          - Formatos de treinamento (vídeos, manuais, workshops)
          - Conteúdo específico para cada tema problemático
          
          ## 2. MELHORIAS NA DOCUMENTAÇÃO
          - Seções da documentação que precisam ser melhoradas
          - Processos que precisam de documentação mais clara
          - Exemplos práticos e casos de uso
          
          ## 3. OTIMIZAÇÃO DE PROCESSOS
          - Fluxos de trabalho que podem ser simplificados
          - Melhorias na interface do sistema ERP
          - Automações que podem reduzir dúvidas
          
          ## 4. FERRAMENTAS E RECURSOS
          - Ferramentas internas que podem facilitar o suporte
          - Recursos de conhecimento compartilhado
          - Integrações que podem melhorar a experiência
          
          ## 5. MÉTRICAS DE ACOMPANHAMENTO
          - KPIs para medir a redução de dúvidas
          - Processos de monitoramento contínuo
          - Indicadores de satisfação do cliente
          
          IMPORTANTE:
          - Use formatação markdown
          - Foco no contexto de suporte técnico do ERP da Olist
          - Recomendações práticas e implementáveis
          - Responda em português de forma clara
        `;
        responseFormat = 'text';
        break;

      case 'google_sheets':
        analysisPrompt = `
          Analise os dados de temas de dúvidas e crie um relatório para Google Sheets:
          
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

    // Gerar análise com Gemini (otimizado para melhor performance)
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash',
      generationConfig: {
        maxOutputTokens: 4096, // Reduzido para melhor performance
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
      }
    });
    
    // Configurar timeout mais conservador
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000); // 45 segundos

    try {
      const result = await model.generateContent(analysisPrompt);
      clearTimeout(timeoutId);
      
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
          totalTopics: limitedTopics.length,
          analysisType,
          note: limitedTopics.length < topics.length ? `Analisados apenas os top ${limitedTopics.length} temas para melhor performance` : null,
          tokensUsed: response.usageMetadata?.totalTokenCount || 'N/A'
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
        errorDetails = 'A análise é muito complexa. Tente com menos dados ou período menor.';
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