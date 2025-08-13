// utils/supabase/helpQueries.js
import { supabaseAdmin } from './supabaseClient';
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
    let query = supabaseAdmin
      .from('help_records')
      .select(`
        *,
        categories:category_id(name)
      `)
      .eq('analyst_id', analystId)
      .order('created_at', { ascending: false });

    // Aplicar filtros de data independentemente do modo
    // Se recebermos um range (days como data no formato YYYY-MM-DD), usamos startDate/endDate
    if (typeof days === 'string' && days.includes('-')) {
      try {
        const startDate = setStartOfDay(days);
        const endDateTime = endDate ? setEndOfDay(endDate) : new Date();
        query = query
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDateTime.toISOString());
      } catch (error) {
        console.error('Erro ao processar datas:', error);
        query = query.gte('created_at', getDaysAgo(30).toISOString());
      }
    } else if (mode !== 'profile') {
      // Quando não é um range explícito e não estamos em profile, aplica filtro de últimos N dias
      const daysNum = parseInt(days) || 30;
      query = query.gte('created_at', getDaysAgo(daysNum).toISOString());
    }

    const { data, error } = await query;
    if (error) throw error;

    // Se for modo profile, calcular contagens respeitando o período selecionado (se houver)
    if (mode === 'profile') {
      // Quando recebemos um range (days como YYYY-MM-DD e endDate definido), tratamos como "Período Atual"
      let currentPeriodCount = data.length;
      let previousPeriodCount = 0;

      if (typeof days === 'string' && days.includes('-') && endDate) {
        try {
          const currentStart = setStartOfDay(days);
          const currentEnd = setEndOfDay(endDate);
          const msInDay = 24 * 60 * 60 * 1000;
          const diffMs = currentEnd.getTime() - currentStart.getTime();
          const previousEnd = new Date(currentStart.getTime() - msInDay);
          const previousStart = new Date(previousEnd.getTime() - diffMs);

          // Buscar período anterior de mesma duração
          const { data: prevData, error: prevError } = await supabaseAdmin
            .from('help_records')
            .select('id')
            .eq('analyst_id', analystId)
            .gte('created_at', previousStart.toISOString())
            .lte('created_at', previousEnd.toISOString());

          if (prevError) {
            throw prevError;
          }
          previousPeriodCount = prevData?.length || 0;
        } catch (e) {
          console.error('Erro ao calcular período anterior:', e);
          previousPeriodCount = 0;
        }
      } else {
        // Sem range explícito: manter comportamento mensal atual/anterior
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

        currentPeriodCount = data.filter(record => {
          const date = new Date(record.created_at);
          return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
        }).length;

        previousPeriodCount = data.filter(record => {
          const date = new Date(record.created_at);
          return date.getMonth() === lastMonth && date.getFullYear() === lastMonthYear;
        }).length;
      }

      // Calcular contagem de ajudas do dia atual usando lógica correta de timezone
      let todayCount = 0;
      
      try {
        // Usar a mesma lógica robusta que funciona na get-agent-help-today.js
        const now = new Date();
        
        // Converter para São Paulo timezone (UTC-3)
        const saoPauloOffset = -3 * 60; // São Paulo é UTC-3 (em minutos)
        const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
        const saoPauloTime = new Date(utcTime + (saoPauloOffset * 60000));
        
        // Início do dia em São Paulo (00:00)
        const todayStart = new Date(saoPauloTime);
        todayStart.setHours(0, 0, 0, 0);
        
        // Fim do dia em São Paulo (23:59:59.999)
        const todayEnd = new Date(saoPauloTime);
        todayEnd.setHours(23, 59, 59, 999);
        
        // Converter de volta para UTC para usar na consulta
        const todayStartUTC = new Date(todayStart.getTime() + (3 * 60 * 60 * 1000));
        const todayEndUTC = new Date(todayEnd.getTime() + (3 * 60 * 60 * 1000));
        
        // Query direta com timezone correto
        const { data: todayData, error: todayError } = await supabaseAdmin
          .from('help_records')
          .select('id')
          .eq('analyst_id', analystId)
          .gte('created_at', todayStartUTC.toISOString())
          .lte('created_at', todayEndUTC.toISOString());
        
        if (todayError) throw todayError;
        todayCount = todayData?.length || 0;
        
      } catch (error) {
        console.error('Erro ao buscar dados do dia atual:', error);
        // Último fallback com valor 0
        todayCount = 0;
      }

      return {
        currentMonth: currentPeriodCount,
        lastMonth: previousPeriodCount,
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
    let query = supabaseAdmin
      .from('help_records')
      .select('requester_name, requester_email')
      .eq('analyst_id', analystId);

    // Aplicar filtros de data usando a função utilitária
    query = applyDateFilters(query, 'created_at', startDate, endDate, 30);
    
    // Se não temos datas específicas, usar o mês atual
    if (!startDate && !endDate) {
      query = supabaseAdmin
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
    let query = supabaseAdmin
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
      query = supabaseAdmin
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
 * VERSÃO ORIGINAL: Apenas help_records
 */
export async function getUserHelpRequests(userEmail) {
  try {
    // Usar funções utilitárias para obter as datas
    const startOfCurrentMonth = getStartOfCurrentMonth();
    const startOfLastMonth = getStartOfLastMonth();
    const startOfNextMonth = getStartOfNextMonth();

    // Buscar contagem do mês atual
    const { data: currentMonthData, error: currentError } = await supabaseAdmin
      .from('help_records')
      .select('id', { count: 'exact' })
      .eq('requester_email', userEmail)
      .gte('created_at', startOfCurrentMonth.toISOString())
      .lt('created_at', startOfNextMonth.toISOString());

    if (currentError) throw currentError;

    // Buscar contagem do mês anterior
    const { data: lastMonthData, error: lastError } = await supabaseAdmin
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
 * Busca a contagem de ajudas solicitadas por um usuário nos últimos dois meses
 * VERSÃO NOVA: Inclui ajudas recebidas de outros agentes
 */
export async function getUserHelpRequestsComplete(userEmail) {
  try {
    // Buscar o ID do usuário primeiro
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', userEmail)
      .single();

    if (userError || !userData) {
      console.warn('Usuário não encontrado:', userEmail);
      // Se não encontrar o usuário, usar apenas help_records
      return await getUserHelpRequests(userEmail);
    }

    const userId = userData.id;

    // Usar funções utilitárias para obter as datas
    const startOfCurrentMonth = getStartOfCurrentMonth();
    const startOfLastMonth = getStartOfLastMonth();
    const startOfNextMonth = getStartOfNextMonth();

    // 1. Buscar ajudas SOLICITADAS (help_records) - mês atual
    const { data: currentMonthHelpRecords, error: currentHelpError } = await supabaseAdmin
      .from('help_records')
      .select('id', { count: 'exact' })
      .eq('requester_email', userEmail)
      .gte('created_at', startOfCurrentMonth.toISOString())
      .lt('created_at', startOfNextMonth.toISOString());

    if (currentHelpError) throw currentHelpError;

    // 2. Buscar ajudas RECEBIDAS de agentes (agent_help_records) - mês atual
    const { data: currentMonthAgentHelps, error: currentAgentError } = await supabaseAdmin
      .from('agent_help_records')
      .select('id', { count: 'exact' })
      .eq('helped_agent_id', userId) // Usar ID do usuário
      .gte('created_at', startOfCurrentMonth.toISOString())
      .lt('created_at', startOfNextMonth.toISOString());

    if (currentAgentError) throw currentAgentError;

    // 3. Buscar ajudas SOLICITADAS (help_records) - mês anterior
    const { data: lastMonthHelpRecords, error: lastHelpError } = await supabaseAdmin
      .from('help_records')
      .select('id', { count: 'exact' })
      .eq('requester_email', userEmail)
      .gte('created_at', startOfLastMonth.toISOString())
      .lt('created_at', startOfCurrentMonth.toISOString());

    if (lastHelpError) throw lastHelpError;

    // 4. Buscar ajudas RECEBIDAS de agentes (agent_help_records) - mês anterior
    const { data: lastMonthAgentHelps, error: lastAgentError } = await supabaseAdmin
      .from('agent_help_records')
      .select('id', { count: 'exact' })
      .eq('helped_agent_id', userId) // Usar ID do usuário
      .gte('created_at', startOfLastMonth.toISOString())
      .lt('created_at', startOfCurrentMonth.toISOString());

    if (lastAgentError) throw lastAgentError;

    // 5. Somar os totais
    const currentMonthTotal = (currentMonthHelpRecords?.length || 0) + (currentMonthAgentHelps?.length || 0);
    const lastMonthTotal = (lastMonthHelpRecords?.length || 0) + (lastMonthAgentHelps?.length || 0);

    return {
      currentMonth: currentMonthTotal,
      lastMonth: lastMonthTotal,
      breakdown: {
        currentMonth: {
          helpRequests: currentMonthHelpRecords?.length || 0,
          agentHelps: currentMonthAgentHelps?.length || 0
        },
        lastMonth: {
          helpRequests: lastMonthHelpRecords?.length || 0,
          agentHelps: lastMonthAgentHelps?.length || 0
        }
      }
    };
  } catch (error) {
    console.error('Erro ao buscar ajudas completas:', error);
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
    let query = supabaseAdmin
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
 * Busca o ranking de categorias completo incluindo ajudas recebidas de outros agentes
 * @param {string} userEmail - Email do usuário
 * @param {string} startDate - Data inicial para filtro (opcional)
 * @param {string} endDate - Data final para filtro (opcional)
 */
export async function getUserCategoryRankingComplete(userEmail, startDate = null, endDate = null) {
  try {
    // Buscar o ID do usuário primeiro
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', userEmail)
      .single();

    if (userError || !userData) {
      console.warn('Usuário não encontrado:', userEmail);
      // Se não encontrar o usuário, usar apenas help_records
      return await getUserCategoryRanking(userEmail, startDate, endDate);
    }

    const userId = userData.id;

    // 1. Query para ajudas SOLICITADAS (help_records)
    let helpRecordsQuery = supabaseAdmin
      .from('help_records')
      .select(`
        categories:category_id (
          id,
          name
        )
      `)
      .eq('requester_email', userEmail);

    // 2. Query para ajudas RECEBIDAS de agentes (agent_help_records)
    let agentHelpsQuery = supabaseAdmin
      .from('agent_help_records')
      .select(`
        categories:category_id (
          id,
          name
        )
      `)
      .eq('helped_agent_id', userId);

    // Aplicar filtros de data em ambas as queries
    helpRecordsQuery = applyDateFilters(helpRecordsQuery, 'created_at', startDate, endDate, 30);
    agentHelpsQuery = applyDateFilters(agentHelpsQuery, 'created_at', startDate, endDate, 30);
    
    // Se não temos datas específicas, usar o mês atual
    if (!startDate && !endDate) {
      const startOfCurrentMonth = getStartOfCurrentMonth().toISOString();
      helpRecordsQuery = helpRecordsQuery.gte('created_at', startOfCurrentMonth);
      agentHelpsQuery = agentHelpsQuery.gte('created_at', startOfCurrentMonth);
    }

    // Executar ambas as queries
    const [helpRecordsResult, agentHelpsResult] = await Promise.all([
      helpRecordsQuery.order('created_at', { ascending: false }),
      agentHelpsQuery.order('created_at', { ascending: false })
    ]);

    if (helpRecordsResult.error) throw helpRecordsResult.error;
    if (agentHelpsResult.error) throw agentHelpsResult.error;

    // Combinar os dados e agrupar por categoria
    const allRecords = [
      ...(helpRecordsResult.data || []),
      ...(agentHelpsResult.data || [])
    ];

    const categoryCounts = allRecords.reduce((acc, record) => {
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
    console.error('Erro ao buscar ranking completo de categorias:', error);
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
    let query = supabaseAdmin
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
    let query = supabaseAdmin
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