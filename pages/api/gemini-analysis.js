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
          Analise os seguintes dados de temas de dúvidas mais frequentes do time de suporte do sistema ERP da Olist em um período de ${period} (${startDate} a ${endDate}):
          
          ${JSON.stringify(topicsData, null, 2)}
          
          Forneça uma análise estruturada e detalhada sobre:
          
          ## 1. PADRÕES IDENTIFICADOS NOS TEMAS MAIS FREQUENTES
          - Identifique os principais padrões nos temas de dúvidas
          - Analise a distribuição percentual dos temas
          - Destaque temas relacionados que podem indicar problemas sistêmicos
          
          ## 2. POSSÍVEIS CAUSAS RAIZ DAS DÚVIDAS
          - Analise por que esses temas específicos geram mais dúvidas
          - Identifique se são problemas de usabilidade, documentação ou complexidade
          - Considere fatores como mudanças no sistema, treinamento da equipe, etc.
          
          ## 3. OPORTUNIDADES DE MELHORIA NA DOCUMENTAÇÃO
          - Sugira melhorias específicas na documentação do sistema ERP
          - Identifique se há falta de clareza em determinados processos
          - Recomende seções que precisam ser expandidas ou criadas
          
          ## 4. SUGESTÕES DE TREINAMENTOS ESPECÍFICOS
          - Recomende treinamentos focados nos temas mais problemáticos
          - Sugira materiais de apoio para a equipe de suporte
          - Identifique se há necessidade de treinamento sobre funcionalidades específicas
          
          ## 5. PRIORIZAÇÃO DE AÇÕES BASEADA NA FREQUÊNCIA
          - Liste ações prioritárias para reduzir o volume de dúvidas
          - Sugira melhorias no sistema que podem resolver problemas recorrentes
          - Recomende processos de acompanhamento para medir o impacto das melhorias
          
          IMPORTANTE:
          - Use formatação markdown para melhor legibilidade
          - Mantenha o foco no contexto de suporte técnico do ERP da Olist
          - Forneça insights acionáveis e práticos
          - Responda em português de forma clara e profissional
        `;
        responseFormat = 'text';
        break;

      case 'recommendations':
        analysisPrompt = `
          Com base nos dados de temas de dúvidas do time de suporte do sistema ERP da Olist:
          
          ${JSON.stringify(topicsData, null, 2)}
          
          Gere recomendações específicas e acionáveis estruturadas da seguinte forma:
          
          ## 1. MATERIAIS DE TREINAMENTO PRIORITÁRIOS
          - Identifique os temas que precisam de treinamento urgente
          - Sugira formatos de treinamento (vídeos, manuais, workshops)
          - Recomende conteúdo específico para cada tema problemático
          
          ## 2. MELHORIAS NA DOCUMENTAÇÃO
          - Sugira seções da documentação que precisam ser melhoradas
          - Identifique processos que precisam de documentação mais clara
          - Recomende exemplos práticos e casos de uso
          
          ## 3. PROCESSOS QUE PODEM SER OTIMIZADOS
          - Identifique fluxos de trabalho que podem ser simplificados
          - Sugira melhorias na interface do sistema ERP
          - Recomende automações que podem reduzir dúvidas
          
          ## 4. FERRAMENTAS OU RECURSOS QUE PODEM AJUDAR
          - Sugira ferramentas internas que podem facilitar o suporte
          - Recomende recursos de conhecimento compartilhado
          - Identifique integrações que podem melhorar a experiência
          
          ## 5. MÉTRICAS DE ACOMPANHAMENTO
          - Defina KPIs para medir a redução de dúvidas
          - Sugira processos de monitoramento contínuo
          - Recomende indicadores de satisfação do cliente
          
          IMPORTANTE:
          - Use formatação markdown para melhor legibilidade
          - Mantenha o foco no contexto de suporte técnico do ERP da Olist
          - Forneça recomendações práticas e implementáveis
          - Responda em português de forma clara e estruturada
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
     return res.status(500).json({ 
       message: 'Erro interno do servidor',
       error: error.message
     });
   }
} 