// utils/supabase/ticketCountQueries.js
import { supabaseAdmin } from './supabaseClient';

/**
 * Adiciona uma nova contagem de chamado
 */
export async function addTicketCount(userId) {
  try {
    const { data, error } = await supabaseAdmin
      .from('ticket_counts')
      .insert([{
        user_id: userId,
        count_value: 1
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao adicionar contagem:', error);
    throw error;
  }
}

/**
 * Remove a última contagem de chamado do dia
 */
export async function removeLastTicketCount(userId) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Buscar o último registro do dia
    const { data: lastCount, error: fetchError } = await supabaseAdmin
      .from('ticket_counts')
      .select('id')
      .eq('user_id', userId)
      .gte('count_date', today.toISOString())
      .order('count_time', { ascending: false })
      .limit(1)
      .single();

    if (fetchError) throw fetchError;

    // Deletar o registro encontrado
    const { error: deleteError } = await supabaseAdmin
      .from('ticket_counts')
      .delete()
      .eq('id', lastCount.id);

    if (deleteError) throw deleteError;

    return true;
  } catch (error) {
    console.error('Erro ao remover última contagem:', error);
    throw error;
  }
}

/**
 * Busca o total de contagens do dia atual
 */
export async function getTodayCount(userId) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data, error } = await supabaseAdmin
      .from('ticket_counts')
      .select('count_value')
      .eq('user_id', userId)
      .gte('count_date', today.toISOString());

    if (error) throw error;

    return data ? data.length : 0;
  } catch (error) {
    console.error('Erro ao buscar contagem do dia:', error);
    throw error;
  }
}

/**
 * Busca contagens por período
 */
export async function getCountsByPeriod(userId, startDate, endDate) {
  try {
    const { data, error } = await supabaseAdmin
      .from('ticket_counts')
      .select('count_date, count_value')
      .eq('user_id', userId)
      .gte('count_date', startDate)
      .lte('count_date', endDate)
      .order('count_date');

    if (error) throw error;

    // Agrupar contagens por data
    const groupedCounts = data.reduce((acc, curr) => {
      const date = new Date(curr.count_date).toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + curr.count_value;
      return acc;
    }, {});

    return {
      labels: Object.keys(groupedCounts),
      values: Object.values(groupedCounts)
    };
  } catch (error) {
    console.error('Erro ao buscar contagens por período:', error);
    throw error;
  }
}

/**
 * Remove todas as contagens do dia
 */
export async function clearTodayCounts(userId) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { error } = await supabaseAdmin
      .from('ticket_counts')
      .delete()
      .eq('user_id', userId)
      .gte('count_date', today.toISOString());

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Erro ao limpar contagens do dia:', error);
    throw error;
  }
}