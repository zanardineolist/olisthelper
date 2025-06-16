import { supabaseAdmin } from './supabaseClient';

/**
 * Cria um novo registro de acesso remoto
 * @param {Object} accessData - Dados do acesso remoto
 * @returns {Promise<Object|null>} - Registro criado ou null em caso de erro
 */
export async function createRemoteAccess(accessData) {
  try {
    // Primeiro, buscar o ID do usuário através do email
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', accessData.email)
      .single();
    
    if (userError) throw userError;
    
    const { data, error } = await supabaseAdmin
      .from('remote_access')
      .insert([{
        support_id: userData.id,
        date: accessData.date,
        time: accessData.time,
        name: accessData.name,
        email: accessData.email,
        ticket_number: accessData.chamado,
        theme: accessData.tema,
        description: accessData.description || ''
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao criar registro de acesso remoto:', error);
    throw error;
  }
}

/**
 * Busca todos os registros de acesso remoto
 * @returns {Promise<Array>} - Lista de registros
 */
export async function getAllRemoteAccess() {
  try {
    const { data, error } = await supabaseAdmin
      .from('remote_access')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao buscar registros de acesso remoto:', error);
    return [];
  }
}

/**
 * Busca registros de acesso remoto de um usuário específico
 * @param {string} email - Email do usuário
 * @returns {Promise<Array>} - Lista de registros
 */
export async function getUserRemoteAccess(email) {
  try {
    const { data, error } = await supabaseAdmin
      .from('remote_access')
      .select('*')
      .eq('email', email)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao buscar registros de acesso remoto do usuário:', error);
    return [];
  }
}

/**
 * Busca registros de acesso remoto de um usuário no mês atual
 * @param {string} email - Email do usuário
 * @returns {Promise<Array>} - Lista de registros
 */
export async function getUserCurrentMonthRemoteAccess(email) {
  try {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);
    
    const { data, error } = await supabaseAdmin
      .from('remote_access')
      .select('*')
      .eq('email', email)
      .gte('created_at', firstDayOfMonth.toISOString())
      .lte('created_at', lastDayOfMonth.toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao buscar registros do mês atual:', error);
    return [];
  }
} 