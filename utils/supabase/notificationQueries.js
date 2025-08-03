// utils/supabase/notificationQueries.js
import { supabaseAdmin } from './supabaseClient';

/**
 * Cria uma nova notificação para usuários com perfis específicos
 * @param {Object} notificationData - Dados da notificação
 * @param {string} notificationData.title - Título da notificação
 * @param {string} notificationData.message - Mensagem da notificação
 * @param {string} notificationData.notification_type - Tipo: 'bell', 'top', 'both'
 * @param {string} notificationData.notification_style - Estilo: 'aviso', 'informacao'
 * @param {Array} notificationData.target_profiles - Array de perfis alvo
 * @param {string} notificationData.created_by - UUID do usuário criador
 * @returns {Promise<Object>} - Resultado da operação
 */
export async function createNotification(notificationData) {
  try {
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .insert([{
        title: notificationData.title,
        message: notificationData.message,
        notification_type: notificationData.notification_type,
        notification_style: notificationData.notification_style,
        target_profiles: notificationData.target_profiles,
        created_by: notificationData.created_by
      }])
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Erro ao criar notificação:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Busca notificações para um usuário específico baseado no seu perfil
 * @param {string} userId - UUID do usuário
 * @param {string} userProfile - Perfil do usuário
 * @param {string} notificationType - Tipo de notificação: 'bell', 'top', 'both'
 * @param {number} limit - Limite de notificações (padrão: 20)
 * @returns {Promise<Array>} - Lista de notificações
 */
export async function getUserNotifications(userId, userProfile, notificationType = 'bell', limit = 20) {
  try {
    let query = supabaseAdmin
      .from('notifications')
      .select(`
        *,
        notification_reads!left (
          user_id,
          read_at
        )
      `)
      .contains('target_profiles', [userProfile])
      .order('created_at', { ascending: false })
      .limit(limit);

    // Filtrar por tipo de notificação se especificado
    if (notificationType !== 'both') {
      query = query.in('notification_type', [notificationType, 'both']);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Marcar se cada notificação foi lida pelo usuário
    const notificationsWithReadStatus = data.map(notification => ({
      ...notification,
      read: notification.notification_reads?.some(read => read.user_id === userId) || false,
      read_at: notification.notification_reads?.find(read => read.user_id === userId)?.read_at || null
    }));

    return notificationsWithReadStatus;
  } catch (error) {
    console.error('Erro ao buscar notificações:', error);
    return [];
  }
}

/**
 * Marca uma notificação como lida para um usuário
 * @param {string} notificationId - UUID da notificação
 * @param {string} userId - UUID do usuário
 * @returns {Promise<boolean>} - Sucesso da operação
 */
export async function markNotificationAsRead(notificationId, userId) {
  try {
    // Verificar se já existe um registro de leitura
    const { data: existingRead } = await supabaseAdmin
      .from('notification_reads')
      .select('notification_id')
      .eq('notification_id', notificationId)
      .eq('user_id', userId)
      .single();

    // Se já foi lida, não fazer nada
    if (existingRead) {
      return true;
    }

    // Inserir novo registro de leitura
    const { error } = await supabaseAdmin
      .from('notification_reads')
      .insert([{
        notification_id: notificationId,
        user_id: userId
      }]);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Erro ao marcar notificação como lida:', error);
    return false;
  }
}

/**
 * Marca múltiplas notificações como lidas para um usuário
 * @param {Array} notificationIds - Array de UUIDs das notificações
 * @param {string} userId - UUID do usuário
 * @returns {Promise<boolean>} - Sucesso da operação
 */
export async function markMultipleNotificationsAsRead(notificationIds, userId) {
  try {
    // Buscar notificações que ainda não foram lidas
    const { data: existingReads } = await supabaseAdmin
      .from('notification_reads')
      .select('notification_id')
      .eq('user_id', userId)
      .in('notification_id', notificationIds);

    const alreadyReadIds = existingReads?.map(read => read.notification_id) || [];
    const unreadIds = notificationIds.filter(id => !alreadyReadIds.includes(id));

    // Se não há notificações não lidas, retornar sucesso
    if (unreadIds.length === 0) {
      return true;
    }

    // Inserir registros de leitura para notificações não lidas
    const readsToInsert = unreadIds.map(notificationId => ({
      notification_id: notificationId,
      user_id: userId
    }));

    const { error } = await supabaseAdmin
      .from('notification_reads')
      .insert(readsToInsert);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Erro ao marcar múltiplas notificações como lidas:', error);
    return false;
  }
}

/**
 * Busca usuários por perfil para envio de notificações
 * @param {Array} profiles - Array de perfis para buscar
 * @returns {Promise<Array>} - Lista de usuários
 */
export async function getUsersByProfiles(profiles) {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, name, email, profile')
      .in('profile', profiles)
      .eq('active', true);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Erro ao buscar usuários por perfil:', error);
    return [];
  }
}

/**
 * Busca estatísticas de notificações para admin
 * @returns {Promise<Object>} - Estatísticas das notificações
 */
export async function getNotificationStats() {
  try {
    // Total de notificações
    const { count: totalNotifications } = await supabaseAdmin
      .from('notifications')
      .select('*', { count: 'exact', head: true });

    // Notificações não lidas (aproximação)
    const { count: totalReads } = await supabaseAdmin
      .from('notification_reads')
      .select('*', { count: 'exact', head: true });

    // Notificações recentes (últimos 7 dias)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const { count: recentNotifications } = await supabaseAdmin
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo.toISOString());

    return {
      total_notifications: totalNotifications || 0,
      total_reads: totalReads || 0,
      recent_notifications: recentNotifications || 0
    };
  } catch (error) {
    console.error('Erro ao buscar estatísticas de notificações:', error);
    return {
      total_notifications: 0,
      total_reads: 0,
      recent_notifications: 0
    };
  }
}