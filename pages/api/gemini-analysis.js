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

    // Preparar dados para análise (aumentar limite para 30 temas)
    const limitedTopics = topics.slice(0, 30);
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
          Analise os seguintes dados de temas de dúvidas mais frequentes do time de suporte do sistema ERP da Olist em um período de ${period} (${startDate} a ${endDate}):
          
          ${JSON.stringify(topicsData, null, 2)}
          
          Forneça uma análise COMPLETA e DETALHADA sobre:
          
          ## 1. PADRÕES IDENTIFICADOS NOS TEMAS MAIS FREQUENTES
          - Identifique os principais padrões nos temas de dúvidas
          - Analise a distribuição percentual dos temas
          - Destaque temas relacionados que podem indicar problemas sistêmicos
          - Identifique se há concentração em áreas específicas do sistema
          
          ## 2. POSSÍVEIS CAUSAS RAIZ DAS DÚVIDAS
          - Analise por que esses temas específicos geram mais dúvidas
          - Identifique se são problemas de usabilidade, documentação ou complexidade
          - Considere fatores como mudanças no sistema, treinamento da equipe, etc.
          - Avalie se há problemas de interface ou fluxo de trabalho
          
          ## 3. OPORTUNIDADES DE MELHORIA NA DOCUMENTAÇÃO
          - Sugira melhorias específicas na documentação do sistema ERP
          - Identifique se há falta de clareza em determinados processos
          - Recomende seções que precisam ser expandidas ou criadas
          - Sugira exemplos práticos e casos de uso que podem ser adicionados
          
          ## 4. SUGESTÕES DE TREINAMENTOS ESPECÍFICOS
          - Recomende treinamentos focados nos temas mais problemáticos
          - Sugira materiais de apoio para a equipe de suporte
          - Identifique se há necessidade de treinamento sobre funcionalidades específicas
          - Proponha workshops práticos para os temas críticos
          
          ## 5. PRIORIZAÇÃO DE AÇÕES BASEADA NA FREQUÊNCIA
          - Liste ações prioritárias para reduzir o volume de dúvidas
          - Sugira melhorias no sistema que podem resolver problemas recorrentes
          - Recomende processos de acompanhamento para medir o impacto das melhorias
          - Defina métricas de sucesso para cada ação sugerida
          
          ## 6. ANÁLISE DE TENDÊNCIAS E RECOMENDAÇÕES FUTURAS
          - Identifique tendências nos dados que podem indicar problemas futuros
          - Sugira ações preventivas baseadas nos padrões identificados
          - Recomende melhorias proativas no sistema e processos
          
          IMPORTANTE:
          - Use formatação markdown para melhor legibilidade
          - Mantenha o foco no contexto de suporte técnico do ERP da Olist
          - Forneça insights acionáveis e práticos
          - Responda em português de forma clara e profissional
          - Seja detalhado e completo em cada seção
          - Inclua exemplos específicos quando relevante
        `;
        responseFormat = 'text';
        break;

      case 'recommendations':
        analysisPrompt = `
          Com base nos dados de temas de dúvidas do time de suporte do sistema ERP da Olist:
          
          ${JSON.stringify(topicsData, null, 2)}
          
          Gere recomendações ESPECÍFICAS e DETALHADAS estruturadas da seguinte forma:
          
          ## 1. MATERIAIS DE TREINAMENTO PRIORITÁRIOS
          - Identifique os temas que precisam de treinamento urgente
          - Sugira formatos de treinamento (vídeos, manuais, workshops)
          - Recomende conteúdo específico para cada tema problemático
          - Defina cronograma sugerido para implementação
          
          ## 2. MELHORIAS NA DOCUMENTAÇÃO
          - Sugira seções da documentação que precisam ser melhoradas
          - Identifique processos que precisam de documentação mais clara
          - Recomende exemplos práticos e casos de uso
          - Proponha estrutura de documentação mais eficiente
          
          ## 3. PROCESSOS QUE PODEM SER OTIMIZADOS
          - Identifique fluxos de trabalho que podem ser simplificados
          - Sugira melhorias na interface do sistema ERP
          - Recomende automações que podem reduzir dúvidas
          - Proponha mudanças nos processos de suporte
          
          ## 4. FERRAMENTAS OU RECURSOS QUE PODEM AJUDAR
          - Sugira ferramentas internas que podem facilitar o suporte
          - Recomende recursos de conhecimento compartilhado
          - Identifique integrações que podem melhorar a experiência
          - Proponha dashboards e relatórios úteis
          
          ## 5. MÉTRICAS DE ACOMPANHAMENTO
          - Defina KPIs para medir a redução de dúvidas
          - Sugira processos de monitoramento contínuo
          - Recomende indicadores de satisfação do cliente
          - Proponha sistema de alertas para temas críticos
          
          ## 6. PLANO DE AÇÃO DETALHADO
          - Priorize as ações sugeridas
          - Defina responsabilidades para cada ação
          - Estabeleça prazos e marcos importantes
          - Proponha indicadores de sucesso
          
          IMPORTANTE:
          - Use formatação markdown para melhor legibilidade
          - Mantenha o foco no contexto de suporte técnico do ERP da Olist
          - Forneça recomendações práticas e implementáveis
          - Responda em português de forma clara e estruturada
          - Seja específico e detalhado em cada recomendação
        `;
        responseFormat = 'text';
        break;

      case 'google_sheets':
        analysisPrompt = `
          Analise os dados de temas de dúvidas e crie um relatório estruturado para Google Sheets:
          
          ${JSON.stringify(topicsData, null, 2)}
          
          Crie um relatório COMPLETO com as seguintes abas:
          1. "Resumo Executivo" - Principais insights e métricas
          2. "Análise Detalhada" - Dados completos com análises
          3. "Recomendações" - Ações sugeridas com prioridade
          4. "Tendências" - Análise temporal e padrões
          5. "Métricas" - KPIs e indicadores de performance
          6. "Ações Prioritárias" - Plano de ação detalhado
          
          Para cada aba, forneça:
          - Estrutura de colunas detalhada
          - Dados formatados e organizados
          - Fórmulas relevantes e úteis
          - Gráficos sugeridos com configurações
          - Filtros e validações recomendadas
          
          Responda em formato JSON com a estrutura completa das abas e dados.
        `;
        responseFormat = 'json';
        break;

      default:
        return res.status(400).json({ message: 'Tipo de análise inválido' });
    }

    // Gerar análise com Gemini (otimizado para respostas mais longas)
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash',
      generationConfig: {
        maxOutputTokens: 8192, // Aumentado significativamente para análises completas
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
      }
    });
    
    // Configurar timeout mais longo para análises complexas
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 segundos

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
      } else if (geminiError.message.includes('timeout')) {
        errorMessage = 'Tempo limite excedido';
        errorDetails = 'A análise é muito complexa. Tente com menos dados ou período menor.';
      } else if (geminiError.message.includes('API key')) {
        errorMessage = 'Erro de configuração da API';
        errorDetails = 'Verifique a configuração da API key do Gemini';
      }
      
      return res.status(500).json({ 
        message: errorMessage,
        error: errorDetails,
        details: process.env.NODE_ENV === 'development' ? geminiError.stack : undefined
      });
    }

  } catch (error) {
    return res.status(500).json({ 
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
} 