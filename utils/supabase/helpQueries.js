import { supabaseAdmin } from './supabaseClient';

/**
 * Busca os registros de ajuda de um analista com filtro de data
 */
export async function getAnalystRecords(analystId, days = 30, mode = 'standard') {
  try {
    let query = supabaseAdmin
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
        // Provavelmente estamos recebendo uma data específica no formato YYYY-MM-DD
        const filterDate = new Date(days);
        
        // Verifica se a data é válida
        if (!isNaN(filterDate.getTime())) {
          query = query.gte('created_at', filterDate.toISOString());
        } else {
          // Fallback para o comportamento padrão
          const defaultDate = new Date();
          defaultDate.setDate(defaultDate.getDate() - 30);
          query = query.gte('created_at', defaultDate.toISOString());
        }
      } else {
        // Comportamento original - usando days como número de dias atrás
        const daysNum = parseInt(days) || 30;
        const filterDate = new Date();
        filterDate.setDate(filterDate.getDate() - daysNum);
        query = query.gte('created_at', filterDate.toISOString());
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

      return {
        currentMonth: currentMonthCount,
        lastMonth: lastMonthCount,
        rows: data.map(row => [
          new Date(row.created_at).toLocaleDateString('pt-BR'),
          new Date(row.created_at).toLocaleTimeString('pt-BR'),
          row.requester_name,
          row.requester_email,
          row.categories?.name || '',
          row.description
        ])
      };
    }

    // Agrupar por data para o gráfico
    const dateGroups = data.reduce((acc, record) => {
      // Verifica se created_at existe e é válido antes de criar um Date
      if (record.created_at) {
        try {
          const date = new Date(record.created_at);
          if (!isNaN(date.getTime())) {
            const formattedDate = date.toLocaleDateString('pt-BR');
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
      rows: data.map(row => {
        try {
          const createdAt = new Date(row.created_at);
          return [
            createdAt.toLocaleDateString('pt-BR'),
            createdAt.toLocaleTimeString('pt-BR'),
            row.requester_name,
            row.requester_email,
            row.categories?.name || '',
            row.description
          ];
        } catch (e) {
          console.error('Erro ao formatar data:', e);
          return [
            'Data inválida',
            'Hora inválida',
            row.requester_name,
            row.requester_email,
            row.categories?.name || '',
            row.description
          ];
        }
      })
    };

  } catch (error) {
    console.error('Erro ao buscar registros do analista:', error);
    throw error;
  }
}

/**
 * Busca o leaderboard de usuários ajudados por um analista
 */
export async function getAnalystLeaderboard(analystId) {
  try {
    // Buscar dados do mês atual
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data, error } = await supabaseAdmin
      .from('help_records')
      .select('requester_name, requester_email')
      .eq('analyst_id', analystId)
      .gte('created_at', startOfMonth.toISOString());

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
export async function getCategoryRanking(analystId) {
  try {
    // Buscar dados do mês atual
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data, error } = await supabaseAdmin
      .from('help_records')
      .select(`
        *,
        categories:category_id(name)
      `)
      .eq('analyst_id', analystId)
      .gte('created_at', startOfMonth.toISOString());

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
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Calcular primeiro dia do mês atual
    const startOfCurrentMonth = new Date(currentYear, currentMonth, 1);
    
    // Calcular primeiro dia do mês anterior
    const startOfLastMonth = new Date(currentYear, currentMonth - 1, 1);
    
    // Calcular primeiro dia do próximo mês (para usar como limite)
    const startOfNextMonth = new Date(currentYear, currentMonth + 1, 1);

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
 * Busca o ranking de categorias mais frequentes nas solicitações de ajuda do usuário
 */
export async function getUserCategoryRanking(userEmail) {
  try {
    // Definir primeiro dia do mês atual
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const { data, error } = await supabaseAdmin
      .from('help_records')
      .select(`
        categories:category_id (
          id,
          name
        )
      `)
      .eq('requester_email', userEmail)
      .gte('created_at', startOfMonth.toISOString())
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