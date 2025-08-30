// utils/supabase/ticketCountQueries.js
import { supabaseAdmin } from './supabaseClient';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

// Configurar dayjs para trabalhar com timezone
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault("America/Sao_Paulo");

/**
 * Buscar registros com paginação e agrupamento por data
 */
export async function getTicketCountHistory(userId, startDate, endDate, page = 1, pageSize = 10) {
  try {
    if (!startDate || !endDate) {
      throw new Error('Datas de início e fim são obrigatórias');
    }
    
    if (!userId) {
      throw new Error('ID do usuário é obrigatório');
    }
    
    // Converter datas para o início e fim do dia em SP
    const start = dayjs.tz(startDate, "America/Sao_Paulo").startOf('day');
    const end = dayjs.tz(endDate, "America/Sao_Paulo").endOf('day');
    
    if (!start.isValid() || !end.isValid()) {
      throw new Error('Datas inválidas fornecidas');
    }

    // Buscar registros do período
    const { data: allData, error: allDataError } = await supabaseAdmin
      .from('ticket_counts')
      .select('count_date, count_time, count_value')
      .eq('user_id', userId)
      .gte('count_date', start.toISOString())
      .lte('count_date', end.toISOString())
      .order('count_date', { ascending: false });
      
    if (allDataError) {
      console.error('Erro ao buscar contagens:', allDataError);
      throw allDataError;
    }

    if (allDataError) throw allDataError;

    // Agrupar dados por data e somar contagens
    const groupedData = allData.reduce((acc, curr) => {
      const date = dayjs(curr.count_date).format('YYYY-MM-DD');
      if (!acc[date]) {
        acc[date] = {
          count_date: date,
          total_count: 0,
          last_update: curr.count_time,
          last_update_formatted: dayjs(`${curr.count_date} ${curr.count_time}`).format('HH:mm')
        };
      }
      acc[date].total_count += curr.count_value;
      // Atualizar horário se for mais recente
      if (!acc[date].last_update || curr.count_time > acc[date].last_update) {
        acc[date].last_update = curr.count_time;
        acc[date].last_update_formatted = dayjs(`${curr.count_date} ${curr.count_time}`).format('HH:mm');
      }
      return acc;
    }, {});

    // Converter para array e ordenar
    const allRecords = Object.values(groupedData)
      .sort((a, b) => {
        // Ordenar primeiro por data
        const dateCompare = dayjs(b.count_date).valueOf() - dayjs(a.count_date).valueOf();
        if (dateCompare !== 0) return dateCompare;
        // Se mesma data, ordenar por horário da última atualização
        return b.last_update.localeCompare(a.last_update);
      });

    const totalRecords = allRecords.length;
    const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));

    // Aplicar paginação
    const startIndex = (page - 1) * pageSize;
    const paginatedRecords = allRecords.slice(startIndex, startIndex + pageSize);

    return {
      records: paginatedRecords,
      allRecords,
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
    const now = dayjs().tz();
    
    const { data, error } = await supabaseAdmin
      .from('ticket_counts')
      .insert([{
        user_id: userId,
        count_value: 1,
        count_date: now.format('YYYY-MM-DD'),
        count_time: now.format('HH:mm:ss.SSS'),
        timezone: "America/Sao_Paulo"
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
    const now = dayjs().tz();
    const today = now.startOf('day');
    const tomorrow = today.add(1, 'day');

    // Buscar o último registro do dia
    const { data: lastCount, error: fetchError } = await supabaseAdmin
      .from('ticket_counts')
      .select('id')
      .eq('user_id', userId)
      .gte('count_date', today.toISOString())
      .lt('count_date', tomorrow.toISOString())
      .order('count_time', { ascending: false })
      .limit(1)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') { // No data found
        return true;
      }
      throw fetchError;
    }

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
    const now = dayjs().tz();
    const today = now.startOf('day');
    const tomorrow = today.add(1, 'day');

    const { data, error } = await supabaseAdmin
      .from('ticket_counts')
      .select('count_value')
      .eq('user_id', userId)
      .gte('count_date', today.toISOString())
      .lt('count_date', tomorrow.toISOString())
      .order('count_time', { ascending: true });

    if (error) throw error;

    // Somar todas as contagens do dia
    return data ? data.reduce((sum, record) => sum + record.count_value, 0) : 0;
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
    const now = dayjs().tz();
    const today = now.startOf('day');
    const tomorrow = today.add(1, 'day');

    const { error } = await supabaseAdmin
      .from('ticket_counts')
      .delete()
      .eq('user_id', userId)
      .gte('count_date', today.toISOString())
      .lt('count_date', tomorrow.toISOString());

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Erro ao limpar contagens do dia:', error);
    throw error;
  }
}