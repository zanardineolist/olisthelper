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
      .leftJoin('users', 'users.id', 'shared_responses.user_id')
      .or(`is_public.eq.true,user_id.eq.${userId}`)
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
    // Validações de entrada
    if (!response.userId) {
      throw new Error('ID do usuário é obrigatório');
    }

    const sanitizedResponse = {
      user_id: response.userId,
      title: response.title?.trim(),
      content: response.content?.trim(),
      tags: Array.isArray(response.tags) ? response.tags : [],
      is_public: !!response.isPublic
    };

    // Verificação de campos obrigatórios
    if (!sanitizedResponse.title || !sanitizedResponse.content) {
      throw new Error('Título e conteúdo são obrigatórios');
    }

    const { data, error } = await supabaseAdmin
      .from('shared_responses')
      .insert([sanitizedResponse])
      .select()
      .single();

    if (error) {
      console.error('Erro detalhado ao adicionar:', error);
      throw error;
    }

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
    // Validações adicionais
    if (!responseId) {
      throw new Error('ID da resposta é obrigatório');
    }

    const sanitizedUpdates = {
      title: updates.title?.trim(),
      content: updates.content?.trim(),
      tags: Array.isArray(updates.tags) ? updates.tags : [],
      is_public: !!updates.isPublic,
      updated_at: new Date()
    };

    // Verificação de campos obrigatórios
    if (!sanitizedUpdates.title || !sanitizedUpdates.content) {
      throw new Error('Título e conteúdo são obrigatórios');
    }

    const { data, error } = await supabaseAdmin
      .from('shared_responses')
      .update(sanitizedUpdates)
      .eq('id', responseId)
      .select()
      .single();

    if (error) {
      console.error('Erro detalhado ao atualizar:', error);
      throw error;
    }

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
    console.log(`Tentando deletar resposta com ID: ${responseId}`);

    // Verificação de existência da mensagem com mais detalhes
    const { data, error } = await supabaseAdmin
      .from('shared_responses')
      .select('id, user_id') // Adicionei user_id para verificações futuras
      .eq('id', responseId)
      .single();

    if (error) {
      console.error('Erro ao buscar mensagem:', error);
      return false;
    }

    if (!data) {
      console.warn(`Resposta com ID ${responseId} não encontrada`);
      return false;
    }

    // Log adicional do usuário da mensagem
    console.log(`Mensagem encontrada. Usuário: ${data.user_id}`);

    const { error: deleteError } = await supabaseAdmin
      .from('shared_responses')
      .delete()
      .eq('id', responseId);

    if (deleteError) {
      console.error('Erro ao deletar resposta:', deleteError);
      return false;
    }

    console.log(`Resposta ${responseId} deletada com sucesso`);
    return true;
  } catch (error) {
    console.error('Erro inesperado ao deletar resposta:', error);
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