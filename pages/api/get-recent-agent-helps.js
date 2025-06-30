import { supabaseAdmin } from '../../utils/supabase/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { helperAgentId, limit = 5 } = req.query;

  if (!helperAgentId) {
    return res.status(400).json({ error: 'ID do agente é obrigatório' });
  }

  try {
    // Buscar registros recentes com detalhes do agente ajudado e categoria
    const { data: recentHelps, error } = await supabaseAdmin
      .from('agent_help_records')
      .select(`
        id,
        description,
        created_at,
        helped_agent:users!agent_help_records_helped_agent_id_fkey(name, email),
        category:categories(name)
      `)
      .eq('helper_agent_id', helperAgentId)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (error) {
      console.error('Erro ao buscar registros recentes:', error);
      throw error;
    }

    // Formatar dados para o frontend
    const formattedHelps = (recentHelps || []).map(help => {
      const createdAt = new Date(help.created_at);
      
      // Converter para timezone de São Paulo
      const saoPauloTime = new Date(createdAt.getTime() - (3 * 60 * 60 * 1000));
      
      return {
        id: help.id,
        helpedAgentName: help.helped_agent?.name || 'Colaborador não encontrado',
        helpedAgentEmail: help.helped_agent?.email || '',
        category: help.category?.name || 'Categoria não encontrada',
        description: help.description,
        formattedDate: saoPauloTime.toLocaleDateString('pt-BR'),
        formattedTime: saoPauloTime.toLocaleTimeString('pt-BR', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        created_at: help.created_at
      };
    });

    return res.status(200).json({ recentHelps: formattedHelps });
  } catch (error) {
    console.error('Erro ao buscar registros recentes de ajuda entre agentes:', error);
    return res.status(500).json({ error: 'Erro ao buscar registros recentes.' });
  }
} 