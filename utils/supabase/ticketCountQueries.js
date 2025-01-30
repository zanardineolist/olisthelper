// utils/supabase/ticketCountQueries.js
import { supabaseAdmin } from './supabaseClient';

/**
 * Buscar registros com paginação e agrupamento por data
 */
export async function getTicketCountHistory(userId, startDate, endDate, page = 1, pageSize = 10) {
  try {
    // Primeiro, buscar todos os registros para o gráfico (sem paginação)
    const { data: allData, error: allDataError } = await supabaseAdmin
      .from('ticket_counts')
      .select('count_date')
      .eq('user_id', userId)
      .gte('count_date', startDate)
      .lte('count_date', endDate)
      .order('count_date', { ascending: false });

    if (allDataError) throw allDataError;

    // Agrupar todos os dados para o gráfico
    const groupedData = allData.reduce((acc, curr) => {
      const date = curr.count_date;
      if (!acc[date]) {
        acc[date] = 0;
      }
      acc[date]++;
      return acc;
    }, {});

    // Calcular total de páginas apenas se houver registros
    const totalRecords = Object.keys(groupedData).length;
    const totalPages = totalRecords > 0 ? Math.ceil(totalRecords / pageSize) : 1;

    // Converter para array e ordenar
    const allRecords = Object.entries(groupedData)
      .map(([count_date, total_count]) => ({
        count_date,
        total_count
      }))
      .sort((a, b) => new Date(b.count_date) - new Date(a.count_date));

    // Aplicar paginação apenas para a tabela
    const paginatedRecords = allRecords.slice((page - 1) * pageSize, page * pageSize);

    return {
      records: paginatedRecords,
      allRecords, // Adicionando todos os registros para o gráfico
      totalPages,
      totalCount: totalRecords,
      currentPage: page
    };
  } catch (error) {
    console.error('Erro ao buscar histórico:', error);
    throw error;
  }
}

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
      .gte('count_date', today.toISOString())
      .lte('count_date', new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString());

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Erro ao limpar contagens do dia:', error);
    throw error;
  }
}