// utils/supabase/knowledgeQueries.js
import { supabaseAdmin } from './supabaseClient';

/**
 * Busca todos os itens da base de conhecimento do usuário
 */
export async function getUserKnowledgeItems(userId, searchTerm = '', tags = [], sessionId = null) {
  try {
    let query = supabaseAdmin
      .from('knowledge_base')
      .select(`
        *,
        knowledge_sessions(name, description)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (searchTerm) {
      query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
    }

    if (tags.length > 0) {
      query = query.contains('tags', tags);
    }

    if (sessionId) {
      query = query.eq('session_id', sessionId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return data.map(item => ({
      ...item,
      session_name: item.knowledge_sessions?.name || 'Sem sessão'
    }));
  } catch (error) {
    console.error('Erro ao buscar itens da base de conhecimento:', error);
    return [];
  }
}

/**
 * Adiciona um novo item à base de conhecimento
 */
export async function addKnowledgeItem({
  userId,
  title,
  description,
  tags,
  sessionId,
  ticketLink
}) {
  try {
    const { data, error } = await supabaseAdmin
      .from('knowledge_base')
      .insert({
        user_id: userId,
        title,
        description,
        tags,
        session_id: sessionId,
        ticket_link: ticketLink
      })
      .select();

    if (error) throw error;
    return data[0];
  } catch (error) {
    console.error('Erro ao adicionar item à base de conhecimento:', error);
    throw error;
  }
}

/**
 * Atualiza um item da base de conhecimento
 */
export async function updateKnowledgeItem(itemId, updates) {
  try {
    const { data, error } = await supabaseAdmin
      .from('knowledge_base')
      .update(updates)
      .eq('id', itemId)
      .select();

    if (error) throw error;
    return data[0];
  } catch (error) {
    console.error('Erro ao atualizar item da base de conhecimento:', error);
    throw error;
  }
}

/**
 * Remove um item da base de conhecimento
 */
export async function deleteKnowledgeItem(itemId) {
  try {
    const { error } = await supabaseAdmin
      .from('knowledge_base')
      .delete()
      .eq('id', itemId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Erro ao remover item da base de conhecimento:', error);
    throw error;
  }
}

/**
 * Busca todas as sessões da base de conhecimento do usuário
 */
export async function getUserKnowledgeSessions(userId) {
  try {
    const { data, error } = await supabaseAdmin
      .from('knowledge_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('name', { ascending: true });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao buscar sessões da base de conhecimento:', error);
    return [];
  }
}

/**
 * Adiciona uma nova sessão à base de conhecimento
 */
export async function addKnowledgeSession({
  userId,
  name,
  description
}) {
  try {
    const { data, error } = await supabaseAdmin
      .from('knowledge_sessions')
      .insert({
        user_id: userId,
        name,
        description
      })
      .select();

    if (error) throw error;
    return data[0];
  } catch (error) {
    console.error('Erro ao adicionar sessão à base de conhecimento:', error);
    throw error;
  }
}

/**
 * Atualiza uma sessão da base de conhecimento
 */
export async function updateKnowledgeSession(sessionId, updates) {
  try {
    const { data, error } = await supabaseAdmin
      .from('knowledge_sessions')
      .update(updates)
      .eq('id', sessionId)
      .select();

    if (error) throw error;
    return data[0];
  } catch (error) {
    console.error('Erro ao atualizar sessão da base de conhecimento:', error);
    throw error;
  }
}

/**
 * Remove uma sessão da base de conhecimento
 */
export async function deleteKnowledgeSession(sessionId) {
  try {
    // Primeiro, atualiza todos os itens dessa sessão para null
    await supabaseAdmin
      .from('knowledge_base')
      .update({ session_id: null })
      .eq('session_id', sessionId);

    // Depois remove a sessão
    const { error } = await supabaseAdmin
      .from('knowledge_sessions')
      .delete()
      .eq('id', sessionId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Erro ao remover sessão da base de conhecimento:', error);
    throw error;
  }
}

/**
 * Consulta o Gemini com os dados da base de conhecimento
 */
export async function queryGeminiWithKnowledge(userId, query) {
  try {
    // Buscar itens de conhecimento do usuário para formar o contexto
    const knowledgeItems = await getUserKnowledgeItems(userId);
    
    if (!knowledgeItems || knowledgeItems.length === 0) {
      return {
        response: "Não encontrei informações na sua base de conhecimento. Adicione alguns itens primeiro."
      };
    }

    // Preparar o contexto para o Gemini
    const context = knowledgeItems.map(item => {
      return `Título: ${item.title}\nDescrição: ${item.description}\nTags: ${item.tags.join(', ')}\n---\n`;
    }).join('\n');

    // Construir o prompt para o Gemini
    const prompt = `
    Você é um assistente de conhecimento que ajuda a responder perguntas com base na base de conhecimento do usuário.
    
    BASE DE CONHECIMENTO:\n${context}\n
    PERGUNTA DO USUÁRIO: ${query}
    
    Responda à pergunta do usuário usando APENAS as informações fornecidas na base de conhecimento acima.
    Se a resposta não puder ser encontrada na base de conhecimento, diga que não encontrou informações suficientes e sugira que o usuário adicione mais conhecimento sobre o assunto.
    Formate sua resposta de maneira clara e concisa, usando parágrafos quando apropriado.
    `;

    // Fazer a chamada para a API do Gemini
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      console.warn('API key do Gemini não configurada');
      return { response: "Integração com IA não configurada. Contate o administrador do sistema." };
    }

    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': geminiApiKey
      },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 800
        }
      })
    });

    const data = await response.json();
    
    // Verificar se há conteúdo na resposta
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      console.error('Resposta inválida do Gemini:', data);
      return { response: "Desculpe, não consegui processar sua consulta. Tente novamente." };
    }
    
    // Extrair o texto da resposta
    const responseText = data.candidates[0].content.parts[0].text;
    return { response: responseText };
  } catch (error) {
    console.error('Erro ao consultar Gemini:', error);
    return { 
      response: "Ocorreu um erro ao consultar a IA. Por favor, tente novamente mais tarde."
    };
  }
}