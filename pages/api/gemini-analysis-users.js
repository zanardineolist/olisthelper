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

    // ESTRATÉGIA OTIMIZADA: Foco nos usuários e suas dúvidas
    const top8Topics = topics.slice(0, 8); // Top 8 temas para análise de usuários
    const topicsData = top8Topics.map((topic, index) => ({
      ranking: index + 1,
      name: topic.name,
      count: topic.count,
      percentage: topic.percentage
    }));

    // Coletar detalhes dos top 6 temas (3 registros por tema para análise profunda de usuários)
    let detailedData = null;
    try {
      const detailsPromises = top8Topics.slice(0, 6).map(async (topic) => {
        try {
          const topicId = topic.id || topic.name;
          const details = await getHelpTopicDetails(topicId, startDate, endDate);
          return {
            topicName: topic.name,
            details: details.slice(0, 3).map(record => ({
              description: record.description?.substring(0, 150) || '', // Mais detalhes para análise de usuários
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
            details: []
          };
        }
      });

      detailedData = await Promise.all(detailsPromises);
    } catch (error) {
      console.error('Erro ao coletar detalhes:', error);
      detailedData = null;
    }

    // Prompt específico para análise de usuários
    const analysisPrompt = `
      Analise os dados de usuários e suas dúvidas no sistema ERP da Olist (${period}: ${startDate} a ${endDate}):
      
      TOP 8 TEMAS PRINCIPAIS:
      ${JSON.stringify(topicsData, null, 2)}
      
      ${detailedData ? `
      REGISTROS DETALHADOS DOS USUÁRIOS (TOP 6 TEMAS):
      ${JSON.stringify(detailedData, null, 2)}
      ` : ''}
      
      Forneça uma análise focada nos USUÁRIOS e suas DÚVIDAS com formatação markdown limpa:
      
      ## 1. PERFIL DOS USUÁRIOS
      
      **Usuários Mais Ativos:**
      - [Identificar usuários que mais pedem ajuda]
      - [Padrões de comportamento dos usuários]
      - [Departamentos ou áreas com mais dúvidas]
      
      **Tipos de Usuários Identificados:**
      - [Usuários iniciantes vs experientes]
      - [Usuários com dúvidas específicas]
      - [Padrões de solicitação por tipo de usuário]
      
      ## 2. ANÁLISE DAS DÚVIDAS DOS USUÁRIOS
      
      **Dúvidas Mais Frequentes:**
      - [Principais tipos de dúvidas dos usuários]
      - [Dúvidas por complexidade]
      - [Dúvidas por área do sistema]
      
      **Padrões Temporais:**
      - [Horários com mais dúvidas]
      - [Dias da semana com mais solicitações]
      - [Padrões sazonais identificados]
      
      ## 3. PROBLEMAS DE USABILIDADE IDENTIFICADOS
      
      **Interface e Navegação:**
      - [Problemas específicos de usabilidade]
      - [Áreas confusas para os usuários]
      - [Funcionalidades que geram mais dúvidas]
      
      **Processos e Fluxos:**
      - [Processos que confundem os usuários]
      - [Etapas que geram mais dúvidas]
      - [Integrações problemáticas]
      
      ## 4. RECOMENDAÇÕES PARA MELHORAR A EXPERIÊNCIA
      
      **Melhorias na Interface:**
      1. [Primeira melhoria específica para usuários]
      2. [Segunda melhoria específica para usuários]
      3. [Terceira melhoria específica para usuários]
      
      **Treinamentos e Suporte:**
      1. [Primeiro treinamento focado nos usuários]
      2. [Segundo treinamento focado nos usuários]
      3. [Terceiro treinamento focado nos usuários]
      
      **Ações Imediatas:**
      1. [Primeira ação para melhorar experiência do usuário]
      2. [Segunda ação para melhorar experiência do usuário]
      3. [Terceira ação para melhorar experiência do usuário]
      
      **IMPORTANTE:**
      - Foque na experiência do USUÁRIO
      - Analise padrões de comportamento
      - Identifique problemas de usabilidade
      - Sugira melhorias específicas para os usuários
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
          totalTopics: top8Topics.length,
          analysisType,
          detailsCount: detailedData ? detailedData.reduce((sum, item) => sum + item.details.length, 0) : 0,
          note: `Análise focada em usuários - top 8 temas com detalhes dos top 6`,
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