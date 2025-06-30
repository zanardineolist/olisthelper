import { supabaseAdmin } from '../../utils/supabase/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { helperAgentId, filter } = req.query;

  if (!helperAgentId) {
    return res.status(400).json({ error: 'ID do agente é obrigatório' });
  }

  try {
    let stats = {};

    if (filter === '1' || filter === 'today') {
      // Buscar apenas estatísticas do dia atual
      const today = new Date();
      today.setUTCHours(3, 0, 0, 0); // 00:00 São Paulo = 03:00 UTC
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const { data, error } = await supabaseAdmin
        .from('agent_help_records')
        .select('id', { count: 'exact' })
        .eq('helper_agent_id', helperAgentId)
        .gte('created_at', today.toISOString())
        .lt('created_at', tomorrow.toISOString());

      if (error) {
        console.error('Erro ao buscar contagem de hoje:', error);
        throw error;
      }

      stats.today = data?.length || 0;
    } else {
      // Buscar estatísticas mensais completas com consultas diretas
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth(); // 0-11
      
      // Mês atual: primeiro dia do mês às 03:00 UTC (00:00 São Paulo)
      const currentMonthStart = new Date(year, month, 1, 3, 0, 0).toISOString();
      const nextMonthStart = new Date(year, month + 1, 1, 3, 0, 0).toISOString();
      
      // Mês anterior: primeiro dia do mês anterior às 03:00 UTC
      const lastMonthStart = new Date(year, month - 1, 1, 3, 0, 0).toISOString();
      const currentMonthStartForLastMonth = new Date(year, month, 1, 3, 0, 0).toISOString();
      
      // Hoje: usar a data atual em São Paulo
      const saoPauloNow = new Date();
      const todayStart = new Date();
      todayStart.setUTCHours(3, 0, 0, 0); // 00:00 São Paulo = 03:00 UTC (aproximadamente)
      
      // Se já passou da meia-noite em São Paulo, usar o dia atual
      if (saoPauloNow.getUTCHours() >= 3) {
        todayStart.setUTCDate(saoPauloNow.getUTCDate());
      } else {
        // Se ainda é antes da meia-noite em São Paulo, usar o dia anterior
        todayStart.setUTCDate(saoPauloNow.getUTCDate() - 1);
      }
      
      const todayEnd = new Date(todayStart);
      todayEnd.setDate(todayEnd.getDate() + 1);
      
      // Buscar contagem do mês atual
      const { data: currentMonthData, error: currentError } = await supabaseAdmin
        .from('agent_help_records')
        .select('id', { count: 'exact' })
        .eq('helper_agent_id', helperAgentId)
        .gte('created_at', currentMonthStart)
        .lt('created_at', nextMonthStart);

      if (currentError) {
        console.error('Erro ao buscar mês atual:', currentError);
        throw currentError;
      }

      // Buscar contagem do mês anterior
      const { data: lastMonthData, error: lastError } = await supabaseAdmin
        .from('agent_help_records')
        .select('id', { count: 'exact' })
        .eq('helper_agent_id', helperAgentId)
        .gte('created_at', lastMonthStart)
        .lt('created_at', currentMonthStartForLastMonth);

      if (lastError) {
        console.error('Erro ao buscar mês anterior:', lastError);
        throw lastError;
      }

      // Buscar contagem de hoje
      const { data: todayData, error: todayError } = await supabaseAdmin
        .from('agent_help_records')
        .select('id', { count: 'exact' })
        .eq('helper_agent_id', helperAgentId)
        .gte('created_at', todayStart.toISOString())
        .lt('created_at', todayEnd.toISOString());

      if (todayError) {
        console.error('Erro ao buscar hoje:', todayError);
        throw todayError;
      }

      stats.currentMonth = currentMonthData?.length || 0;
      stats.lastMonth = lastMonthData?.length || 0;
      stats.today = todayData?.length || 0;
    }

    return res.status(200).json(stats);
  } catch (error) {
    console.error('Erro ao buscar estatísticas de ajuda:', error);
    return res.status(500).json({ error: 'Erro ao buscar estatísticas.' });
  }
} 