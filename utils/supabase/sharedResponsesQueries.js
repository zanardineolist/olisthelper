// utils/supabase/sharedResponsesQueries.js
import { supabaseAdmin } from './supabaseClient';

/**
 * Busca todas as respostas públicas e as privadas do usuário
 */
export async function getAllResponses(userId, searchTerm = '', tags = []) {
  try {
    let query = supabaseAdmin
      .from('shared_responses')
      .select(`
        *,
        users (
          name
        ),
        favorites:user_favorites!left (
          user_id
        ),
        favorites_count:user_favorites(count)
      `)
      .eq('is_public', true)
      .order('created_at', { ascending: false });

    if (searchTerm) {
      query = query.or(`title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%`);
    }

    if (tags.length > 0) {
      query = query.contains('tags', tags);
    }

    const { data, error } = await query;
    if (error) throw error;

    return data.map(message => ({
      ...message,
      author_name: message.users?.name || 'Usuário desconhecido',
      // Verifica se o usuário favoritou esta mensagem
      isFavorite: message.favorites?.some(fav => fav.user_id === userId) || false,
      // Calcula o total de favoritos
      favorites_count: message.favorites_count?.[0]?.count || 0
    }));
  } catch (error) {
    console.error('Erro ao buscar respostas:', error);
    return [];
  }
}

/**
 * Busca apenas as respostas do usuário
 */
export async function getUserResponses(userId, searchTerm = '', tags = []) {
  try {
    let query = supabaseAdmin
      .from('shared_responses')
      .select(`
        *,
        users (
          name
        ),
        favorites:user_favorites!left (
          user_id
        ),
        favorites_count:user_favorites(count)
      `)
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

    return data.map(message => ({
      ...message,
      author_name: message.users?.name || 'Usuário desconhecido',
      isFavorite: message.favorites?.some(fav => fav.user_id === userId) || false,
      favorites_count: message.favorites_count?.[0]?.count || 0
    }));
  } catch (error) {
    console.error('Erro ao buscar respostas do usuário:', error);
    return [];
  }
}

/**
 * Busca as respostas favoritas do usuário
 */
export async function getFavoriteResponses(userId) {
  try {
    const { data, error } = await supabaseAdmin
      .from('user_favorites')
      .select(`
        response_id,
        shared_responses (
          *,
          users (
            name
          ),
          favorites:user_favorites!left (
            user_id
          ),
          favorites_count:user_favorites(count)
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data
      .filter(item => item.shared_responses)
      .map(item => ({
        ...item.shared_responses,
        author_name: item.shared_responses.users?.name || 'Usuário desconhecido',
        isFavorite: true, // Já sabemos que é favorito pois está nesta lista
        favorites_count: item.shared_responses.favorites_count?.[0]?.count || 0
      }));
  } catch (error) {
    console.error('Erro ao buscar favoritos:', error);
    return [];
  }
}

/**
 * Adiciona uma nova resposta
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
        is_public: response.isPublic,
        copy_count: 0, // Inicializa contagem de cópias
        created_at: new Date(),
        updated_at: new Date()
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
 */
export async function updateResponse(responseId, updates) {
  try {
    // Manter apenas os campos que precisam ser atualizados
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
 * Incrementa o contador de cópias
 */
export async function incrementCopyCount(responseId) {
  try {
    const { data, error } = await supabaseAdmin.rpc(
      'update_message_copy_count',
      { message_id: responseId }
    );

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Erro ao incrementar contagem de cópias:', error);
    return false;
  }
}

/**
 * Remove uma resposta
 */
export async function deleteResponse(responseId) {
  try {
    // Primeiro remove os favoritos
    await supabaseAdmin
      .from('user_favorites')
      .delete()
      .eq('response_id', responseId);

    // Depois remove a mensagem
    const { error } = await supabaseAdmin
      .from('shared_responses')
      .delete()
      .eq('id', responseId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Erro ao deletar resposta:', error);
    return false;
  }
}

/**
 * Adiciona/Remove um favorito
 */
export async function toggleFavorite(userId, responseId) {
  const { data: existingFavorite, error: checkError } = await supabaseAdmin
    .from('user_favorites')
    .select('id')
    .eq('user_id', userId)
    .eq('response_id', responseId)
    .single();

  if (checkError && checkError.code !== 'PGRST116') {
    throw checkError;
  }

  try {
    if (existingFavorite) {
      // Remove o favorito
      const { error } = await supabaseAdmin
        .from('user_favorites')
        .delete()
        .eq('user_id', userId)
        .eq('response_id', responseId);

      if (error) throw error;
      return false; // não é mais favorito
    } else {
      // Adiciona o favorito
      const { error } = await supabaseAdmin
        .from('user_favorites')
        .insert([{ 
          user_id: userId, 
          response_id: responseId,
          created_at: new Date()
        }]);

      if (error) throw error;
      return true; // agora é favorito
    }
  } catch (error) {
    console.error('Erro ao alterar favorito:', error);
    throw error;
  }
}