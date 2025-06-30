import { supabaseAdmin } from '../../utils/supabase/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { helperAgentId } = req.query;

  if (!helperAgentId) {
    return res.status(400).json({ error: 'ID do agente é obrigatório' });
  }

  try {
    // Buscar todos os registros do dia atual
    const today = new Date();
    today.setUTCHours(3, 0, 0, 0); // 00:00 São Paulo = 03:00 UTC
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { data: todayHelps, error } = await supabaseAdmin
      .from('agent_help_records')
      .select(`
        id,
        description,
        created_at,
        updated_at,
        helped_agent:users!agent_help_records_helped_agent_id_fkey(name, email),
        category:categories(name)
      `)
      .eq('helper_agent_id', helperAgentId)
      .gte('created_at', today.toISOString())
      .lt('created_at', tomorrow.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar registros do dia:', error);
      throw error;
    }

    // Formatar dados para o frontend
    const formattedHelps = (todayHelps || []).map(help => {
      const createdAt = new Date(help.created_at);
      const updatedAt = new Date(help.updated_at);
      
      // Converter para timezone de São Paulo
      const saoPauloCreated = new Date(createdAt.getTime() - (3 * 60 * 60 * 1000));
      const saoPauloUpdated = new Date(updatedAt.getTime() - (3 * 60 * 60 * 1000));
      
      return {
        id: help.id,
        helpedAgentName: help.helped_agent?.name || 'Colaborador não encontrado',
        helpedAgentEmail: help.helped_agent?.email || '',
        category: help.category?.name || 'Categoria não encontrada',
        description: help.description,
        formattedDate: saoPauloCreated.toLocaleDateString('pt-BR'),
        formattedTime: saoPauloCreated.toLocaleTimeString('pt-BR', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        created_at: help.created_at,
        updated_at: help.updated_at,
        lastModified: saoPauloUpdated.toLocaleString('pt-BR')
      };
    });

    return res.status(200).json({ 
      todayHelps: formattedHelps,
      total: formattedHelps.length 
    });
  } catch (error) {
    console.error('Erro ao buscar registros do dia:', error);
    return res.status(500).json({ error: 'Erro ao buscar registros do dia.' });
  }
} 