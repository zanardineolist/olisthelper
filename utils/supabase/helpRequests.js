// utils/supabase/helpRequests.js
import { supabase } from './supabaseClient';

/**
 * Registra uma nova dúvida/pedido de ajuda
 */
export async function createHelpRequest(data) {
  try {
    const { error } = await supabase
      .from('help_records')
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
    console.error('Erro ao registrar pedido de ajuda:', error);
    throw error;
  }
}