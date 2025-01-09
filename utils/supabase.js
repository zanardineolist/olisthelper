import { createClient } from '@supabase/supabase-js';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase environment variables');
}

/**
 * Obtém o user-id do cookie
 * @returns {string|null}
 */
function getUserIdFromCookie() {
  if (typeof window === 'undefined') return null;
  
  const cookies = document.cookie.split(';');
  const userIdCookie = cookies.find(c => c.trim().startsWith('user-id='));
  return userIdCookie ? decodeURIComponent(userIdCookie.split('=')[1]) : null;
}

// Criar cliente Supabase com configurações personalizadas
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      // Adicionar headers para cada requisição
      headers: async () => {
        const userId = getUserIdFromCookie();
        return {
          'x-user-id': userId || undefined
        };
      }
    }
  }
);

/**
 * Configura o contexto RLS do Supabase
 * @param {string} userId - ID do usuário
 */
export async function setSupabaseContext(userId) {
  if (!userId) {
    throw new Error('User ID is required');
  }

  try {
    await supabase.rpc('set_claim', {
      name: 'request.user_id',
      value: userId
    });
  } catch (error) {
    console.error('Error setting Supabase context:', error);
    throw error;
  }
}

/**
 * Inicializa ou atualiza usuário no Supabase
 * @param {Object} user - Objeto com dados do usuário
 * @returns {Promise<Object>} Dados do usuário criado/atualizado
 */
export async function initializeUser(user) {
  if (!user?.id || !user?.email) {
    throw new Error('User ID and email are required');
  }

  try {
    // Configurar contexto RLS
    await setSupabaseContext(user.id);

    // Inserir/atualizar usuário
    const { data, error } = await supabase
      .from('users')
      .upsert({
        id: user.id,
        email: user.email,
        name: user.name,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id',
        returning: true
      });

    if (error) {
      throw error;
    }

    return data?.[0];
  } catch (error) {
    console.error('Error initializing user:', error);
    throw error;
  }
}

/**
 * Busca mensagens com filtros
 * @param {Object} params - Parâmetros de busca
 * @returns {Promise<Array>} Array de mensagens
 */
export async function fetchMessages(params) {
  const { isPrivate, userId, searchTerm, tags } = params;

  try {
    let query = supabase
      .from('messages')
      .select(`
        *,
        users!messages_user_id_fkey (
          name
        ),
        message_tags (
          tags (
            id,
            name
          )
        ),
        message_likes (
          user_id
        )
      `);

    // Aplicar filtros
    if (isPrivate) {
      query = query.eq('user_id', userId);
    } else {
      query = query.eq('is_shared', true);
    }

    if (searchTerm) {
      query = query.or(`title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%`);
    }

    if (tags?.length > 0) {
      query = query.contains('message_tags.tags.id', tags);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error fetching messages:', error);
    throw error;
  }
}

/**
 * Busca tags disponíveis
 * @returns {Promise<Array>} Array de tags
 */
export async function fetchTags() {
  try {
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .order('name');

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error fetching tags:', error);
    throw error;
  }
}

/**
 * Toggle like em uma mensagem
 * @param {string} messageId - ID da mensagem
 * @param {string} userId - ID do usuário
 * @returns {Promise<Object>} Resultado da operação
 */
export async function toggleMessageLike(messageId, userId) {
  try {
    // Verificar se já existe um like
    const { data: existingLike } = await supabase
      .from('message_likes')
      .select()
      .eq('message_id', messageId)
      .eq('user_id', userId)
      .single();

    if (existingLike) {
      // Remover like
      const { error } = await supabase
        .from('message_likes')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', userId);

      if (error) throw error;
      return { liked: false };
    } else {
      // Adicionar like
      const { error } = await supabase
        .from('message_likes')
        .insert([{
          message_id: messageId,
          user_id: userId
        }]);

      if (error) throw error;
      return { liked: true };
    }
  } catch (error) {
    console.error('Error toggling message like:', error);
    throw error;
  }
}