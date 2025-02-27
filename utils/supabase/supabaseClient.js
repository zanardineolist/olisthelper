// utils/supabase/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('As variáveis de ambiente do Supabase não estão configuradas.');
}

// Cliente Supabase com chave anônima (para operações do cliente)
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Cliente Supabase com chave de serviço (para operações administrativas)
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

/**
 * Busca um usuário pelo email
 * @param {string} email - Email do usuário
 * @returns {Promise<Object|null>} - Dados do usuário ou null
 */
export async function getUserByEmail(email) {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    return null;
  }
}

/**
 * Cria um novo usuário no Supabase
 * @param {Object} userData - Dados do usuário para criar
 * @returns {Promise<Object|null>} - Usuário criado ou null em caso de erro
 */
export async function createUser(userData) {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .insert([{
        name: userData.name,
        email: userData.email,
        profile: userData.profile || 'support',
        squad: userData.squad || null,
        can_ticket: userData.can_ticket || false,
        can_phone: userData.can_phone || false,
        can_chat: userData.can_chat || false,
        active: true,
        created_at: new Date(),
        updated_at: new Date(),
        last_sign_in: new Date()
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    return null;
  }
}

/**
 * Atualiza um usuário existente
 * @param {string} userId - ID do usuário
 * @param {Object} updates - Campos a serem atualizados
 * @returns {Promise<Object|null>} - Usuário atualizado ou null
 */
export async function updateUser(userId, updates) {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .update({
        ...updates,
        updated_at: new Date()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    return null;
  }
}

/**
 * Atualiza o último login do usuário
 * @param {string} userId - ID do usuário
 * @returns {Promise<boolean>} - Sucesso da operação
 */
export async function updateLastSignIn(userId) {
  try {
    const { error } = await supabaseAdmin
      .from('users')
      .update({ 
        last_sign_in: new Date(),
        updated_at: new Date()
      })
      .eq('id', userId);

    return !error;
  } catch (error) {
    console.error('Erro ao atualizar último login:', error);
    return false;
  }
}

/**
 * Verifica se um email é de domínio permitido
 * @param {string} email - Email para verificar
 * @returns {boolean} - Se o email é permitido
 */
export function isAllowedEmail(email) {
  const allowedDomains = ['olist.com', 'tiny.com.br'];
  const emailDomain = email.split('@')[1];
  return allowedDomains.includes(emailDomain);
}

/**
 * Busca todos os usuários ativos
 * @returns {Promise<Array>} - Lista de usuários
 */
export async function getAllActiveUsers() {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('active', true)
      .order('name');

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    return [];
  }
}

/**
 * Verifica e retorna as permissões de um usuário
 * @param {string} userId - ID do usuário
 * @returns {Promise<Object>} - Objeto com as permissões
 */
/**
 * Busca todas as categorias ativas
 * @returns {Promise<Array>} - Lista de categorias
 */
export async function getAllCategories() {
  try {
    const { data, error } = await supabaseAdmin
      .from('categories')
      .select('*')
      .eq('active', true)
      .order('name');

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao buscar categorias:', error);
    return [];
  }
}

/**
 * Cria uma nova categoria
 * @param {string} name - Nome da categoria
 * @param {string} userId - ID do usuário que está criando
 * @returns {Promise<Object|null>} - Categoria criada ou null em caso de erro
 */
export async function createCategory(name, userId) {
  try {
    const { data, error } = await supabaseAdmin
      .from('categories')
      .insert([{
        name,
        created_by: userId,
        updated_by: userId
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao criar categoria:', error);
    return null;
  }
}

/**
 * Atualiza uma categoria existente
 * @param {string} categoryId - ID da categoria
 * @param {string} name - Novo nome da categoria
 * @param {string} userId - ID do usuário que está atualizando
 * @returns {Promise<Object|null>} - Categoria atualizada ou null
 */
export async function updateCategory(categoryId, name, userId) {
  try {
    const { data, error } = await supabaseAdmin
      .from('categories')
      .update({
        name,
        updated_at: new Date(),
        updated_by: userId
      })
      .eq('id', categoryId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao atualizar categoria:', error);
    return null;
  }
}

/**
 * Marca uma categoria como inativa
 * @param {string} categoryId - ID da categoria
 * @param {string} userId - ID do usuário que está deletando
 * @returns {Promise<boolean>} - Sucesso da operação
 */
export async function deleteCategory(categoryId, userId) {
  try {
    const { error } = await supabaseAdmin
      .from('categories')
      .update({
        active: false,
        updated_at: new Date(),
        updated_by: userId
      })
      .eq('id', categoryId);

    return !error;
  } catch (error) {
    console.error('Erro ao deletar categoria:', error);
    return false;
  }
}

export async function getUserPermissions(userId) {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('profile, can_ticket, can_phone, can_chat')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao buscar permissões:', error);
    return null;
  }
}