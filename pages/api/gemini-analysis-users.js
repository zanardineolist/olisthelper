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

    const { topics, period, startDate, endDate, analysisType } = req.body;

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

    // ESTRATÉGIA OTIMIZADA: Foco nos 5 primeiros temas e top 10 usuários
    const top5Topics = topics.slice(0, 5); // Top 5 temas para análise focada
    const topicsData = top5Topics.map((topic, index) => ({
      ranking: index + 1,
      name: topic.name,
      count: topic.count,
      percentage: topic.percentage
    }));

    // Coletar detalhes dos top 5 temas com foco nos usuários mais ativos
    let detailedData = null;
    let topUsers = null;
    try {
      const detailsPromises = top5Topics.map(async (topic) => {
        try {
          const topicId = topic.id || topic.name;
          const details = await getHelpTopicDetails(topicId, startDate, endDate);
          
          // Agrupar por usuário para identificar os mais ativos
          const userCounts = {};
          details.forEach(record => {
            const userName = record.requester_name || 'Usuário não identificado';
            userCounts[userName] = (userCounts[userName] || 0) + 1;
          });
          
          // Ordenar usuários por frequência e pegar os top 10
          const sortedUsers = Object.entries(userCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([userName, count]) => ({ userName, count }));
          
          return {
            topicName: topic.name,
            topUsers: sortedUsers,
            details: details.slice(0, 5).map(record => ({
              description: record.description?.substring(0, 150) || '',
              date: record.formattedDate,
              analyst: record.analyst_name,
              requester: record.requester_name || 'Usuário não identificado',
              time: record.formattedTime
            }))
          };
        } catch (detailError) {
          console.error(`Erro ao buscar detalhes para tema ${topic.name}:`, detailError);
          return {
            topicName: topic.name,
            topUsers: [],
            details: []
          };
        }
      });

      detailedData = await Promise.all(detailsPromises);
      
      // Consolidar top 10 usuários gerais dos 5 temas
      const allUserCounts = {};
      detailedData.forEach(topicData => {
        topicData.topUsers.forEach(user => {
          allUserCounts[user.userName] = (allUserCounts[user.userName] || 0) + user.count;
        });
      });
      
      topUsers = Object.entries(allUserCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([userName, count]) => ({ userName, count }));
        
    } catch (error) {
      console.error('Erro ao coletar detalhes:', error);
      detailedData = null;
      topUsers = null;
    }

    // Prompt específico para análise de usuários
    const analysisPrompt = `
      Analise os dados de usuários e suas dúvidas no sistema ERP da Olist (${period}: ${startDate} a ${endDate}):
      
      TOP 5 TEMAS PRINCIPAIS:
      ${JSON.stringify(topicsData, null, 2)}
      
      ${topUsers ? `
      TOP 10 USUÁRIOS MAIS ATIVOS (CONSOLIDADO DOS 5 TEMAS):
      ${JSON.stringify(topUsers, null, 2)}
      ` : ''}
      
      ${detailedData ? `
      DETALHES POR TEMA (TOP 5 TEMAS):
      ${JSON.stringify(detailedData, null, 2)}
      ` : ''}
      
      Forneça uma análise focada nos USUÁRIOS e suas DÚVIDAS com formatação markdown limpa:
      
      ## 1. PERFIL DOS USUÁRIOS MAIS ATIVOS
      
      **Top 10 Usuários com Mais Solicitações:**
      - [Analisar os 10 usuários que mais pedem ajuda]
      - [Identificar padrões de comportamento específicos]
      - [Verificar se há concentração em departamentos específicos]
      
      **Análise por Tema:**
      - [Quais usuários são mais ativos em cada tema]
      - [Padrões de dúvidas específicas por usuário]
      - [Usuários que pedem ajuda em múltiplos temas]
      
      ## 2. ANÁLISE DAS DÚVIDAS POR USUÁRIO
      
      **Dúvidas dos Usuários Mais Ativos:**
      - [Tipos de dúvidas dos top 10 usuários]
      - [Complexidade das dúvidas por usuário]
      - [Temas específicos que cada usuário mais pede ajuda]
      
      **Padrões de Solicitação:**
      - [Horários preferidos dos usuários mais ativos]
      - [Frequência de solicitações por usuário]
      - [Padrões de dúvidas recorrentes]
      
      ## 3. PROBLEMAS DE USABILIDADE IDENTIFICADOS
      
      **Problemas Específicos dos Usuários Mais Ativos:**
      - [Problemas de usabilidade identificados nos top 10 usuários]
      - [Áreas do sistema que mais confundem esses usuários]
      - [Funcionalidades que geram mais dúvidas para eles]
      
      **Processos Problemáticos:**
      - [Processos que mais confundem os usuários ativos]
      - [Etapas específicas que geram dúvidas recorrentes]
      - [Integrações que causam mais problemas]
      
      ## 4. RECOMENDAÇÕES ESPECÍFICAS PARA OS USUÁRIOS MAIS ATIVOS
      
      **Melhorias na Interface:**
      1. [Primeira melhoria específica para os top 10 usuários]
      2. [Segunda melhoria específica para os top 10 usuários]
      3. [Terceira melhoria específica para os top 10 usuários]
      
      **Treinamentos Personalizados:**
      1. [Primeiro treinamento focado nos usuários mais ativos]
      2. [Segundo treinamento focado nos usuários mais ativos]
      3. [Terceiro treinamento focado nos usuários mais ativos]
      
      **Ações Imediatas:**
      1. [Primeira ação para reduzir dúvidas dos usuários mais ativos]
      2. [Segunda ação para reduzir dúvidas dos usuários mais ativos]
      3. [Terceira ação para reduzir dúvidas dos usuários mais ativos]
      
      **IMPORTANTE:**
      - Foque especificamente nos TOP 10 USUÁRIOS MAIS ATIVOS
      - Analise padrões de comportamento dos usuários mais frequentes
      - Identifique problemas de usabilidade específicos desses usuários
      - Sugira melhorias direcionadas aos usuários que mais pedem ajuda
      - Use formatação markdown limpa
      - Seja conciso (máximo 1200 palavras)
      - Responda em português
      - Use listas numeradas (1. 2. 3.) e com marcadores (-) de forma consistente
      - Certifique-se de que cada item da lista numerada tenha o número correto (1, 2, 3, etc.)
    `;

    // Configuração otimizada para análise de usuários
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash',
      generationConfig: {
        maxOutputTokens: 1500, // Otimizado para análise de usuários
        temperature: 0.6, // Reduzido para mais consistência
        topP: 0.8,
        topK: 40,
      }
    });
    
    // Timeout otimizado para 25 segundos
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000); // 25 segundos

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
          totalTopics: top5Topics.length,
          analysisType,
          detailsCount: detailedData ? detailedData.reduce((sum, item) => sum + item.details.length, 0) : 0,
          topUsersCount: topUsers ? topUsers.length : 0,
          note: `Análise focada nos top 10 usuários - top 5 temas com detalhes consolidados`,
          tokensUsed: response.usageMetadata?.totalTokenCount || 'N/A',
          model: 'gemini-2.0-flash',
          limits: {
            rpm: 15,
            tpm: 1000000,
            rpd: 200
          }
        }
      });

    } catch (geminiError) {
      clearTimeout(timeoutId);
      
      console.error('Erro do Gemini:', geminiError);
      
      let errorMessage = 'Erro ao gerar análise de usuários com Gemini';
      let errorDetails = geminiError.message;
      
      // Tratar erros específicos do Gemini
      if (geminiError.message.includes('quota')) {
        errorMessage = 'Limite de requisições excedido';
        errorDetails = 'Tente novamente em alguns instantes';
      } else if (geminiError.message.includes('timeout') || geminiError.name === 'AbortError') {
        errorMessage = 'Tempo limite excedido';
        errorDetails = 'A análise é muito complexa. Tente com período menor.';
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