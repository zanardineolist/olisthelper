import { supabaseAdmin } from '../../utils/supabase/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Buscar apenas usuários que são agentes (analyst, tax, super, quality, dev)
    const validAgentProfiles = ['analyst', 'tax', 'super', 'quality', 'dev'];
    
    const { data: agents, error: agentsError } = await supabaseAdmin
      .from('users')
      .select('id, name, email, profile, squad, active')
      .in('profile', validAgentProfiles)
      .eq('active', true)
      .order('name');

    if (agentsError) {
      console.error('Erro ao buscar agentes:', agentsError);
      throw agentsError;
    }

    if (!agents || agents.length === 0) {
      return res.status(404).json({ error: 'Nenhum agente encontrado.' });
    }

    // Mapear dados para o frontend
    const mappedAgents = agents.map(agent => ({
      id: agent.id,
      name: agent.name,
      email: agent.email,
      profile: agent.profile,
      squad: agent.squad,
      active: agent.active
    }));

    return res.status(200).json({ agents: mappedAgents });
  } catch (error) {
    console.error('Erro ao buscar agentes:', error);
    return res.status(500).json({ error: 'Erro ao buscar agentes.' });
  }
} 