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
    // Implementação futura para integração com Gemini
    // Esta é apenas uma estrutura básica
    return {
      response: "Funcionalidade de integração com Gemini em desenvolvimento."
    };
  } catch (error) {
    console.error('Erro ao consultar Gemini:', error);
    throw error;
  }
}