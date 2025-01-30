// utils/supabase/helpRequests.js
import { supabaseAdmin } from './supabaseClient';

/**
 * Registra uma nova dúvida/pedido de ajuda
 */
export async function createHelpRequest(data) {
  try {
    const { error } = await supabaseAdmin
      .from('help_requests')
      .insert([{
        requester_id: data.requesterId,
        analyst_id: data.analystId,
        category_id: data.categoryId,
        description: data.description,
        status: 'created'
      }]);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Erro ao registrar pedido de ajuda:', error);
    return false;
  }
}

/**
 * Registra uma ajuda prestada pelo analista
 */
export async function createAnalystHelp(data) {
  try {
    const { error } = await supabaseAdmin
      .from('analyst_help')
      .insert([{
        analyst_id: data.analystId,
        requester_name: data.userName,
        requester_email: data.userEmail,
        category_id: data.categoryId,
        description: data.description
      }]);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Erro ao registrar ajuda do analista:', error);
    return false;
  }
}