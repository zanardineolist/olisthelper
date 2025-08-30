import { supabaseAdmin } from './supabaseClient';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

// Configurar dayjs
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault("America/Sao_Paulo");

/**
 * Adicionar novo log de chamado
 */
export async function addTicketLog(userId, ticketUrl, description = '', ticketType = 'novo') {
  try {
    if (!userId || !ticketUrl) {
      throw new Error('User ID e URL do chamado são obrigatórios');
    }

    // Validar se URL é válida
    try {
      new URL(ticketUrl);
    } catch {
      throw new Error('URL do chamado inválida');
    }

    const now = dayjs().tz();
    
    const { data, error } = await supabaseAdmin
      .from('ticket_logs')
      .insert({
        user_id: userId,
        ticket_url: ticketUrl.trim(),
        description: description?.trim() || null,
        ticket_type: ticketType || 'novo',
        logged_date: now.format('YYYY-MM-DD'),
        logged_time: now.format('HH:mm:ss'),
        timezone: 'America/Sao_Paulo'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao adicionar log de chamado:', error);
    throw error;
  }
}

/**
 * Buscar logs de chamados com paginação
 */
export async function getTicketLogs(userId, startDate, endDate, page = 1, pageSize = 10) {
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

    // Calcular offset para paginação
    const offset = (page - 1) * pageSize;

    // Buscar registros do período com paginação
    const { data, error, count } = await supabaseAdmin
      .from('ticket_logs')
      .select('id, user_id, ticket_url, description, ticket_type, logged_date, logged_time::text, timezone, created_at', { count: 'exact' })
      .eq('user_id', userId)
      .gte('logged_date', start.format('YYYY-MM-DD'))
      .lte('logged_date', end.format('YYYY-MM-DD'))
      .order('logged_date', { ascending: false })
      .order('logged_time', { ascending: false })
      .range(offset, offset + pageSize - 1);
      
    if (error) {
      console.error('Erro ao buscar logs:', error);
      throw error;
    }

    // Calcular estatísticas do período
    const totalPages = Math.ceil((count || 0) / pageSize);
    
    return {
      records: data || [],
      totalCount: count || 0,
      totalPages,
      currentPage: page,
      pageSize
    };
  } catch (error) {
    console.error('Erro ao buscar histórico de logs:', error);
    throw error;
  }
}

/**
 * Buscar contagem de hoje
 */
export async function getTodayTicketCount(userId) {
  try {
    const today = dayjs().tz().format('YYYY-MM-DD');

    const { data, error } = await supabaseAdmin
      .from('ticket_logs')
      .select('id')
      .eq('user_id', userId)
      .eq('logged_date', today);

    if (error) throw error;
    return data ? data.length : 0;
  } catch (error) {
    console.error('Erro ao buscar contagem do dia:', error);
    throw error;
  }
}

/**
 * Buscar chamados por hora do dia atual (para o gráfico)
 */
export async function getTodayHourlyData(userId) {
  try {
    const today = dayjs().tz().format('YYYY-MM-DD');

    const { data, error } = await supabaseAdmin
      .from('ticket_logs')
      .select('logged_time::text')
      .eq('user_id', userId)
      .eq('logged_date', today);

    if (error) throw error;

    // Agrupar por hora
    const hourlyData = {};
    
    // Inicializar todas as horas com 0
    for (let hour = 0; hour < 24; hour++) {
      hourlyData[hour] = 0;
    }

    // Contar chamados por hora
    data?.forEach(record => {
      try {
        const timeStr = record.logged_time;
        let hour = 0;
        
        if (timeStr) {
          // Se for um timestamp completo, extrair apenas a hora
          if (timeStr.includes('T') || timeStr.includes(' ')) {
            hour = parseInt(dayjs(timeStr).format('H'));
          } else if (timeStr.includes(':')) {
            // Se for apenas time, pegar a primeira parte
            const timeParts = timeStr.split(':');
            hour = parseInt(timeParts[0]);
          }
        }
        
        if (hour >= 0 && hour <= 23) {
          hourlyData[hour]++;
        }
      } catch (error) {
        console.error('Erro ao processar hora do registro:', record, error);
      }
    });

    // Converter para formato do gráfico
    const chartData = Object.entries(hourlyData).map(([hour, count]) => ({
      hour: `${hour.padStart(2, '0')}:00`,
      count: count,
      hourNumber: parseInt(hour)
    }));

    return chartData;
  } catch (error) {
    console.error('Erro ao buscar dados por hora:', error);
    throw error;
  }
}

/**
 * Remover log de chamado
 */
export async function removeTicketLog(userId, logId) {
  try {
    if (!userId || !logId) {
      throw new Error('User ID e ID do log são obrigatórios');
    }

    const { error } = await supabaseAdmin
      .from('ticket_logs')
      .delete()
      .eq('id', logId)
      .eq('user_id', userId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Erro ao remover log:', error);
    throw error;
  }
}

/**
 * Buscar estatísticas gerais
 */
export async function getTicketLogStats(userId, startDate, endDate) {
  try {
    const start = dayjs.tz(startDate, "America/Sao_Paulo").startOf('day');
    const end = dayjs.tz(endDate, "America/Sao_Paulo").endOf('day');

    const { data, error } = await supabaseAdmin
      .from('ticket_logs')
      .select('logged_date, logged_time, ticket_type')
      .eq('user_id', userId)
      .gte('logged_date', start.format('YYYY-MM-DD'))
      .lte('logged_date', end.format('YYYY-MM-DD'));

    if (error) throw error;

    // Calcular estatísticas
    const totalTickets = data?.length || 0;
    const daysBetween = end.diff(start, 'days') + 1;
    const dailyAverage = totalTickets > 0 ? (totalTickets / daysBetween).toFixed(1) : 0;

    // Agrupar por data para encontrar melhor dia
    const dailyGroups = {};
    data?.forEach(record => {
      const date = record.logged_date;
      dailyGroups[date] = (dailyGroups[date] || 0) + 1;
    });

    const bestDay = Object.entries(dailyGroups).reduce((best, [date, count]) => {
      return count > (best.count || 0) ? { date, count } : best;
    }, {});

    // Calcular totalizadores por tipo
    const typeStats = {
      novo: 0,
      interacao: 0,
      rfc: 0
    };

    data?.forEach(record => {
      const ticketType = record.ticket_type || 'novo';
      if (typeStats.hasOwnProperty(ticketType)) {
        typeStats[ticketType]++;
      }
    });

    return {
      totalTickets,
      dailyAverage: parseFloat(dailyAverage),
      bestDay: bestDay.count ? bestDay : null,
      daysBetween,
      typeStats
    };
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    throw error;
  }
}