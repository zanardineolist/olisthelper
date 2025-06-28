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
      // Buscar estatísticas do dia atual
      const { data, error } = await supabaseAdmin
        .rpc('get_agent_help_today_count', { helper_id_param: helperAgentId });

      if (error) {
        console.error('Erro ao buscar contagem de hoje:', error);
        throw error;
      }

      stats.today = data || 0;
    } else {
      // Buscar estatísticas mensais completas
      const { data, error } = await supabaseAdmin
        .rpc('get_agent_help_monthly_stats', { helper_id_param: helperAgentId });

      if (error) {
        console.error('Erro ao buscar estatísticas mensais:', error);
        throw error;
      }

      if (data && data.length > 0) {
        const result = data[0];
        stats.currentMonth = result.current_month || 0;
        stats.lastMonth = result.last_month || 0;
        stats.today = result.today || 0;
      } else {
        stats.currentMonth = 0;
        stats.lastMonth = 0;
        stats.today = 0;
      }
    }

    return res.status(200).json(stats);
  } catch (error) {
    console.error('Erro ao buscar estatísticas de ajuda entre agentes:', error);
    return res.status(500).json({ error: 'Erro ao buscar estatísticas.' });
  }
} 