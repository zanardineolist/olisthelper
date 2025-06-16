// utils/supabase/helpQueries.js
import { supabase } from './supabaseClient';
import { setStartOfDay, setEndOfDay, getDaysAgo, getStartOfCurrentMonth, getStartOfLastMonth, getStartOfNextMonth, formatDateBR, formatTimeBR, applyDateFilters } from './dateUtils';

/**
 * Busca os registros de ajuda de um analista com filtro de data
 * @param {string} analystId - ID do analista
 * @param {string} days - Número de dias para filtro ou data inicial no formato YYYY-MM-DD
 * @param {string} mode - Modo de operação: 'standard', 'profile'
 * @param {string} endDate - Data final para filtro personalizado
 * @param {boolean} includeUserDetails - Flag para incluir detalhes do usuário
 * @param {boolean} includeCategoryDetails - Flag para incluir detalhes da categoria
 */
export async function getAnalystRecords(analystId, days = 30, mode = 'standard', endDate = null, includeUserDetails = false, includeCategoryDetails = false) {
  try {
    let query = supabase
      .from('help_records')
      .select(`
        *,
        categories:category_id(name)
      `)
      .eq('analyst_id', analystId)
      .order('created_at', { ascending: false });

    // Se for modo profile, não aplica filtro de data inicialmente
    if (mode !== 'profile') {
      // Verifica se days é uma string que contém "-" (indicativo de data ISO)
      if (typeof days === 'string' && days.includes('-')) {
        // Estamos recebendo um range de datas
        try {
          // Usar as funções de utilitário para tratar as datas
          const startDate = setStartOfDay(days);
          const endDateTime = endDate ? setEndOfDay(endDate) : new Date();
          
          // Aplicar o filtro de data no range completo
          query = query
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDateTime.toISOString());
        } catch (error) {
          console.error('Erro ao processar datas:', error);
          // Fallback para o comportamento padrão
          query = query.gte('created_at', getDaysAgo(30).toISOString());
        }
      } else {
        // Comportamento original - usando days como número de dias atrás
        const daysNum = parseInt(days) || 30;
        query = query.gte('created_at', getDaysAgo(daysNum).toISOString());
      }
    }

    const { data, error } = await query;
    if (error) throw error;

    // Se for modo profile, calcular contagens por mês
    if (mode === 'profile') {
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

      const currentMonthCount = data.filter(record => {
        const date = new Date(record.created_at);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
      }).length;

      const lastMonthCount = data.filter(record => {
        const date = new Date(record.created_at);
        return date.getMonth() === lastMonth && date.getFullYear() === lastMonthYear;
      }).length;
      
      // Calcular contagem de ajudas do dia atual diretamente do Supabase usando o fuso horário do Brasil
      const brtDate = new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" });
      const today = new Date(brtDate);
      today.setHours(0, 0, 0, 0);
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      // Consulta separada para obter contagem precisa do dia atual
      const { data: todayData, error: todayError } = await supabase
        .from('help_records')
        .select('id', { count: 'exact' })
        .eq('analyst_id', analystId)
        .gte('created_at', today.toISOString())
        .lt('created_at', tomorrow.toISOString());
      
      if (todayError) throw todayError;
      const todayCount = todayData.length;
      
      // Log para debug
      

      return {
        currentMonth: currentMonthCount,
        lastMonth: lastMonthCount,
        today: todayCount,
        rows: data.map(row => [
          formatDateBR(row.created_at),
          formatTimeBR(row.created_at),
          row.requester_name,
          row.requester_email,
          row.categories?.name || '',
          row.description
        ])
      };
    }

    // Agrupar por data para o gráfico
    const dateGroups = data.reduce((acc, record) => {
      // Verifica se created_at existe e é válido
      if (record.created_at) {
        try {
          const formattedDate = formatDateBR(record.created_at);
          if (formattedDate !== 'Data inválida') {
            acc[formattedDate] = (acc[formattedDate] || 0) + 1;
          }
        } catch (e) {
          console.error('Erro ao processar data:', e);
        }
      }
      return acc;
    }, {});

    return {
      count: data.length,
      dates: Object.keys(dateGroups),
      counts: Object.values(dateGroups),
      rows: data.map(row => [
        formatDateBR(row.created_at),
        formatTimeBR(row.created_at),
        row.requester_name,
        row.requester_email,
        row.categories?.name || '',
        row.description
      ])
    };

  } catch (error) {
    console.error('Erro ao buscar registros do analista:', error);
    throw error;
  }
}

/**
 * Busca o leaderboard de usuários ajudados por um analista
 */
export async function getAnalystLeaderboard(analystId, startDate = null, endDate = null) {
  try {
    let query = supabase
      .from('help_records')
      .select('requester_name, requester_email')
      .eq('analyst_id', analystId);

    // Aplicar filtros de data usando a função utilitária
    query = applyDateFilters(query, 'created_at', startDate, endDate, 30);
    
    // Se não temos datas específicas, usar o mês atual
    if (!startDate && !endDate) {
      query = supabase
        .from('help_records')
        .select('requester_name, requester_email')
        .eq('analyst_id', analystId)
        .gte('created_at', getStartOfCurrentMonth().toISOString());
    }

    const { data, error } = await query;
    if (error) throw error;

    // Agrupar e contar ajudas por usuário
    const userCounts = data.reduce((acc, record) => {
      const key = `${record.requester_name}|${record.requester_email}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    // Formatar para retorno
    const rows = Object.entries(userCounts)
      .map(([key, count]) => {
        const [name, email] = key.split('|');
        return [new Date().toLocaleDateString('pt-BR'), '', name, email, count.toString(), ''];
      })
      .sort((a, b) => parseInt(b[4]) - parseInt(a[4]))
      .slice(0, 5);

    return { rows };
  } catch (error) {
    console.error('Erro ao buscar leaderboard:', error);
    throw error;
  }
}

/**
 * Busca o ranking de categorias de um analista
 */
export async function getCategoryRanking(analystId, startDate = null, endDate = null) {
  try {
    let query = supabase
      .from('help_records')
      .select(`
        *,
        categories:category_id(name)
      `)
      .eq('analyst_id', analystId);

    // Aplicar filtros de data usando a função utilitária
    query = applyDateFilters(query, 'created_at', startDate, endDate, 30);
    
    // Se não temos datas específicas, usar o mês atual
    if (!startDate && !endDate) {
      query = supabase
        .from('help_records')
        .select(`
          *,
          categories:category_id(name)
        `)
        .eq('analyst_id', analystId)
        .gte('created_at', getStartOfCurrentMonth().toISOString());
    }

    const { data, error } = await query;
    if (error) throw error;

    // Agrupar e contar por categoria
    const categoryCounts = data.reduce((acc, record) => {
      const categoryName = record.categories?.name;
      if (categoryName) {
        acc[categoryName] = (acc[categoryName] || 0) + 1;
      }
      return acc;
    }, {});

    // Formatar para retorno
    const ranking = Object.entries(categoryCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return { categories: ranking };
  } catch (error) {
    console.error('Erro ao buscar ranking de categorias:', error);
    throw error;
  }
}

/**
 * Busca a contagem de ajudas solicitadas por um usuário nos últimos dois meses
 */
export async function getUserHelpRequests(userEmail) {
  try {
    // Usar funções utilitárias para obter as datas
    const startOfCurrentMonth = getStartOfCurrentMonth();
    const startOfLastMonth = getStartOfLastMonth();
    const startOfNextMonth = getStartOfNextMonth();

    // Buscar contagem do mês atual
    const { data: currentMonthData, error: currentError } = await supabase
      .from('help_records')
      .select('id', { count: 'exact' })
      .eq('requester_email', userEmail)
      .gte('created_at', startOfCurrentMonth.toISOString())
      .lt('created_at', startOfNextMonth.toISOString());

    if (currentError) throw currentError;

    // Buscar contagem do mês anterior
    const { data: lastMonthData, error: lastError } = await supabase
      .from('help_records')
      .select('id', { count: 'exact' })
      .eq('requester_email', userEmail)
      .gte('created_at', startOfLastMonth.toISOString())
      .lt('created_at', startOfCurrentMonth.toISOString());

    if (lastError) throw lastError;

    return {
      currentMonth: currentMonthData.length,
      lastMonth: lastMonthData.length
    };
  } catch (error) {
    console.error('Erro ao buscar ajudas solicitadas:', error);
    throw error;
  }
}

/**
 * Busca o ranking de categorias mais frequentes nas solicitações de ajuda do usuário
 * @param {string} userEmail - Email do usuário
 * @param {string} startDate - Data inicial para filtro (opcional)
 * @param {string} endDate - Data final para filtro (opcional)
 */
export async function getUserCategoryRanking(userEmail, startDate = null, endDate = null) {
  try {
    let query = supabase
      .from('help_records')
      .select(`
        categories:category_id (
          id,
          name
        )
      `)
      .eq('requester_email', userEmail);

    // Aplicar filtros de data usando a função utilitária
    query = applyDateFilters(query, 'created_at', startDate, endDate, 30);
    
    // Se não temos datas específicas, usar o mês atual
    if (!startDate && !endDate) {
      query = query.gte('created_at', getStartOfCurrentMonth().toISOString());
    }

    // Executar a query
    const { data, error } = await query
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Agrupar e contar ocorrências por categoria
    const categoryCounts = data.reduce((acc, record) => {
      const categoryName = record.categories?.name;
      if (categoryName) {
        acc[categoryName] = (acc[categoryName] || 0) + 1;
      }
      return acc;
    }, {});

    // Converter para array, ordenar e pegar top 10
    const sortedCategories = Object.entries(categoryCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return { categories: sortedCategories };
  } catch (error) {
    console.error('Erro ao buscar ranking de categorias:', error);
    throw error;
  }
}

/**
 * Obtém o ranking completo de temas de dúvidas em um período de tempo
 * @param {string} startDate - Data inicial (YYYY-MM-DD)
 * @param {string} endDate - Data final (YYYY-MM-DD)
 * @returns {Promise<Array>} - Lista de temas ordenada por contagem
 */
export async function getHelpTopicsRanking(startDate = null, endDate = null) {
  try {
    // Construir a consulta base
    let query = supabase
      .from('help_records')
      .select(`
        categories:category_id (
          id,
          name
        )
      `);

    // Aplicar filtros de data
    query = applyDateFilters(query, 'created_at', startDate, endDate, 30);

    // Executar a consulta
    const { data, error } = await query;
    if (error) throw error;

    // Agrupar e contar ocorrências por categoria
    const categoryCounts = data.reduce((acc, record) => {
      const categoryName = record.categories?.name;
      const categoryId = record.categories?.id;
      
      if (categoryName && categoryId) {
        if (!acc[categoryId]) {
          acc[categoryId] = {
            id: categoryId,
            name: categoryName,
            count: 0
          };
        }
        acc[categoryId].count += 1;
      }
      return acc;
    }, {});

    // Converter para array e ordenar por contagem (maior para menor)
    const ranking = Object.values(categoryCounts)
      .sort((a, b) => b.count - a.count);
    
    // Calcular o total e adicionar percentagem
    const total = ranking.reduce((sum, item) => sum + item.count, 0);
    
    const rankingWithPercentage = ranking.map(item => ({
      ...item,
      percentage: total ? Math.round((item.count / total) * 100 * 10) / 10 : 0
    }));

    return rankingWithPercentage;
  } catch (error) {
    console.error('Erro ao buscar ranking de temas de dúvidas:', error);
    throw error;
  }
}

/**
 * Busca os detalhes das ajudas relacionadas a uma categoria específica
 * @param {number} categoryId - ID da categoria/tema
 * @param {string} startDate - Data inicial (YYYY-MM-DD)
 * @param {string} endDate - Data final (YYYY-MM-DD)
 * @returns {Promise<Array>} - Lista de registros de ajuda para o tema específico
 */
export async function getHelpTopicDetails(categoryId, startDate = null, endDate = null) {
  try {
    // Construir a consulta base
    let query = supabase
      .from('help_records')
      .select(`
        id,
        created_at,
        description,
        requester_name,
        analyst_id,
        users:analyst_id(name),
        categories:category_id (
          id,
          name
        )
      `)
      .eq('category_id', categoryId)
      .order('created_at', { ascending: false });

    // Aplicar filtros de data
    query = applyDateFilters(query, 'created_at', startDate, endDate, 30);

    // Executar a consulta
    const { data, error } = await query;
    if (error) throw error;

    // Formatar as datas para exibição
    const formattedData = data.map(record => ({
      ...record,
      formattedDate: formatDateBR(new Date(record.created_at)),
      formattedTime: formatTimeBR(new Date(record.created_at)),
      categoryName: record.categories?.name || 'Sem categoria',
      analyst_name: record.users?.name || 'Analista desconhecido'
    }));

    return formattedData;
  } catch (error) {
    console.error('Erro ao buscar detalhes do tema de dúvidas:', error);
    throw error;
  }
}