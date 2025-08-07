import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import { getHelpTopicDetails } from '../../utils/supabase/helpQueries';

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

    const { topics, period, startDate, endDate, analysisType, includeDetails = false } = req.body;

    if (!topics || !Array.isArray(topics)) {
      return res.status(400).json({ message: 'Dados de temas são obrigatórios' });
    }

    // Importação dinâmica para evitar problemas de SSR
    let GoogleGenerativeAI;
    try {
      const module = await import('@google/generative-ai');
      GoogleGenerativeAI = module.GoogleGenerativeAI;
    } catch (importError) {
      console.error('Erro ao importar GoogleGenerativeAI:', importError);
      return res.status(500).json({ 
        message: 'Erro ao carregar biblioteca de IA',
        error: 'Falha na importação do módulo'
      });
    }

    // ETAPA 1: Coletar dados básicos dos temas
    const limitedTopics = topics.slice(0, 10);
    const topicsData = limitedTopics.map((topic, index) => ({
      ranking: index + 1,
      name: topic.name,
      count: topic.count,
      percentage: topic.percentage
    }));

    // ETAPA 2: Se solicitado, coletar detalhes de cada tema
    let detailedData = null;
    if (includeDetails) {
      try {
        const detailsPromises = limitedTopics.map(async (topic) => {
          try {
            // Verificar se o topic tem id, caso contrário usar o nome para buscar
            const topicId = topic.id || topic.name;
            const details = await getHelpTopicDetails(topicId, startDate, endDate);
            return {
              topicId: topicId,
              topicName: topic.name,
              details: details.slice(0, 20) // Limitar a 20 registros por tema para não sobrecarregar
            };
          } catch (detailError) {
            console.error(`Erro ao buscar detalhes para tema ${topic.name}:`, detailError);
            return {
              topicId: topic.id || topic.name,
              topicName: topic.name,
              details: []
            };
          }
        });

        detailedData = await Promise.all(detailsPromises);
      } catch (error) {
        console.error('Erro ao coletar detalhes:', error);
        // Continuar sem detalhes se houver erro
      }
    }

    // ETAPA 3: Preparar prompt baseado no tipo de análise
    let analysisPrompt = '';
    let responseFormat = '';

    switch (analysisType) {
      case 'insights':
        analysisPrompt = `
          Analise os dados de temas de dúvidas do sistema ERP da Olist (${period}: ${startDate} a ${endDate}):
          
          DADOS BÁSICOS DOS TEMAS:
          ${JSON.stringify(topicsData, null, 2)}
          
          ${detailedData ? `
          DETALHES DOS REGISTROS DE AJUDA:
          ${JSON.stringify(detailedData, null, 2)}
          ` : ''}
          
          Forneça uma análise completa sobre:
          
          ## 1. PADRÕES PRINCIPAIS
          - 3 principais padrões nos temas de dúvidas
          - Distribuição percentual dos temas mais críticos
          ${detailedData ? '- Padrões nos registros de ajuda detalhados' : ''}
          
          ## 2. CAUSAS DAS DÚVIDAS
          - Por que os temas principais geram mais dúvidas
          - Problemas de usabilidade ou documentação
          ${detailedData ? '- Análise das descrições dos registros de ajuda' : ''}
          
          ## 3. MELHORIAS SUGERIDAS
          - 3 melhorias principais para documentação
          - 3 treinamentos prioritários
          ${detailedData ? '- Sugestões baseadas nos registros detalhados' : ''}
          
          ## 4. AÇÕES IMEDIATAS
          - 3 ações para reduzir volume de dúvidas
          - Melhorias no sistema para problemas recorrentes
          ${detailedData ? '- Ações específicas baseadas nos dados detalhados' : ''}
          
          IMPORTANTE:
          - Use formatação markdown
          - Foco no contexto de suporte técnico do ERP da Olist
          - Seja detalhado e completo
          - Responda em português
          ${detailedData ? '- Inclua insights específicos dos registros de ajuda' : ''}
        `;
        responseFormat = 'text';
        break;

      case 'recommendations':
        analysisPrompt = `
          Com base nos dados de temas de dúvidas do sistema ERP da Olist:
          
          DADOS BÁSICOS DOS TEMAS:
          ${JSON.stringify(topicsData, null, 2)}
          
          ${detailedData ? `
          DETALHES DOS REGISTROS DE AJUDA:
          ${JSON.stringify(detailedData, null, 2)}
          ` : ''}
          
          Gere recomendações detalhadas:
          
          ## 1. TREINAMENTOS PRIORITÁRIOS
          - 3 temas que precisam de treinamento urgente
          - Formatos de treinamento recomendados
          ${detailedData ? '- Treinamentos específicos baseados nos registros' : ''}
          
          ## 2. MELHORIAS NA DOCUMENTAÇÃO
          - 3 seções que precisam ser melhoradas
          - Exemplos práticos que podem ser adicionados
          ${detailedData ? '- Melhorias baseadas nos problemas identificados' : ''}
          
          ## 3. OTIMIZAÇÕES DE PROCESSO
          - 3 fluxos que podem ser simplificados
          - Melhorias na interface do sistema
          ${detailedData ? '- Otimizações baseadas nos dados reais' : ''}
          
          ## 4. FERRAMENTAS ÚTEIS
          - 3 ferramentas que podem facilitar o suporte
          - Recursos de conhecimento compartilhado
          ${detailedData ? '- Ferramentas específicas para os problemas identificados' : ''}
          
          ## 5. MÉTRICAS IMPORTANTES
          - 3 KPIs para medir redução de dúvidas
          - Indicadores de satisfação
          ${detailedData ? '- Métricas baseadas nos dados detalhados' : ''}
          
          IMPORTANTE:
          - Use formatação markdown
          - Foco no contexto de suporte técnico do ERP da Olist
          - Seja detalhado e completo
          - Responda em português
          ${detailedData ? '- Inclua recomendações específicas baseadas nos registros' : ''}
        `;
        responseFormat = 'text';
        break;

      default:
        return res.status(400).json({ message: 'Tipo de análise inválido' });
    }

    // ETAPA 4: Gerar análise com Gemini
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash',
      generationConfig: {
        maxOutputTokens: 4096, // Aumentado para análises mais completas
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
      }
    });
    
    // Timeout mais longo para análises complexas
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 segundos

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
          analysisType,
          includeDetails,
          detailsCount: detailedData ? detailedData.reduce((sum, item) => sum + item.details.length, 0) : 0,
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