// utils/supabase/sharedResponsesQueries.js
import { supabaseAdmin } from './supabaseClient';

/**
 * Busca todas as respostas públicas e as privadas do usuário
 * @param {string} userId - ID do usuário atual
 * @param {string} searchTerm - Termo de busca (opcional)
 * @param {Array} tags - Array de tags para filtrar (opcional)
 * @returns {Promise<Array>} - Lista de respostas
 */
export async function getAllResponses(userId, searchTerm = '', tags = []) {
  try {
    let query = supabaseAdmin
      .from('shared_responses')
      .select(`
        *,
        users (name),
        user_favorites (user_id)
      `)
      .eq('users.id', 'shared_responses.user_id')
      .or(`is_public.eq.true, user_id.eq.${userId}`)
      .order('favorites_count', { ascending: false });

    if (searchTerm) {
      query = query.or(`title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%`);
    }

    if (tags.length > 0) {
      query = query.contains('tags', tags);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Processar os dados para incluir a flag isFavorite
    return data.map(message => ({
      ...message,
      isFavorite: message.user_favorites?.some(fav => fav.user_id === userId) || false
    }));
  } catch (error) {
    console.error('Erro ao buscar respostas:', error);
    return [];
  }
}

/**
 * Busca apenas as respostas do usuário
 * @param {string} userId - ID do usuário
 * @param {string} searchTerm - Termo de busca (opcional)
 * @param {Array} tags - Array de tags para filtrar (opcional)
 * @returns {Promise<Array>} - Lista de respostas do usuário
 */
export async function getUserResponses(userId, searchTerm = '', tags = []) {
  try {
    let query = supabaseAdmin
      .from('shared_responses')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (searchTerm) {
      query = query.or(`title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%`);
    }

    if (tags.length > 0) {
      query = query.contains('tags', tags);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao buscar respostas do usuário:', error);
    return [];
  }
}

/**
 * Busca as respostas favoritas do usuário
 * @param {string} userId - ID do usuário
 * @returns {Promise<Array>} - Lista de respostas favoritas
 */
export async function getFavoriteResponses(userId) {
  try {
    const { data, error } = await supabaseAdmin
      .from('user_favorites')
      .select(`
        response_id,
        shared_responses (*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data
      .filter(item => item.shared_responses)
      .map(item => ({
        ...item.shared_responses,
        isFavorite: true
      }));
  } catch (error) {
    console.error('Erro ao buscar favoritos:', error);
    return [];
  }
}

/**
 * Adiciona uma nova resposta
 * @param {Object} response - Dados da resposta
 * @returns {Promise<Object>} - Resposta criada
 */
export async function addResponse(response) {
  try {
    const { data, error } = await supabaseAdmin
      .from('shared_responses')
      .insert([{
        user_id: response.userId,
        title: response.title,
        content: response.content,
        tags: response.tags,
        is_public: response.isPublic
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao adicionar resposta:', error);
    throw error;
  }
}

/**
 * Atualiza uma resposta existente
 * @param {string} responseId - ID da resposta
 * @param {Object} updates - Campos a serem atualizados
 * @returns {Promise<Object>} - Resposta atualizada
 */
export async function updateResponse(responseId, updates) {
  try {
    const { data, error } = await supabaseAdmin
      .from('shared_responses')
      .update({
        title: updates.title,
        content: updates.content,
        tags: updates.tags,
        is_public: updates.isPublic,
        updated_at: new Date()
      })
      .eq('id', responseId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao atualizar resposta:', error);
    throw error;
  }
}

/**
 * Remove uma resposta
 * @param {string} responseId - ID da resposta
 * @returns {Promise<boolean>} - Sucesso da operação
 */
export async function deleteResponse(responseId) {
  try {
    const { error } = await supabaseAdmin
      .from('shared_responses')
      .delete()
      .eq('id', responseId);

    return !error;
  } catch (error) {
    console.error('Erro ao deletar resposta:', error);
    return false;
  }
}

/**
 * Adiciona/Remove um favorito
 * @param {string} userId - ID do usuário
 * @param {string} responseId - ID da resposta
 * @param {boolean} isFavorite - Se deve adicionar ou remover
 * @returns {Promise<boolean>} - Sucesso da operação
 */
export async function toggleFavorite(userId, responseId, isFavorite) {
  try {
    if (isFavorite) {
      const { error } = await supabaseAdmin
        .from('user_favorites')
        .insert([{ user_id: userId, response_id: responseId }]);
      return !error;
    } else {
      const { error } = await supabaseAdmin
        .from('user_favorites')
        .delete()
        .eq('user_id', userId)
        .eq('response_id', responseId);
      return !error;
    }
  } catch (error) {
    console.error('Erro ao alterar favorito:', error);
    return false;
  }
}

/**
 * Verifica se uma resposta é favorita do usuário
 * @param {string} userId - ID do usuário
 * @param {string} responseId - ID da resposta
 * @returns {Promise<boolean>} - Se é favorita ou não
 */
export async function isFavorite(userId, responseId) {
  try {
    const { data, error } = await supabaseAdmin
      .from('user_favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('response_id', responseId)
      .single();

    if (error) return false;
    return !!data;
  } catch (error) {
    console.error('Erro ao verificar favorito:', error);
    return false;
  }
}