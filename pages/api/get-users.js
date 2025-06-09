// pages/api/get-users.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Buscar usuários e dados de performance para obter supervisores
    const [usersResult, performanceResult] = await Promise.all([
      supabase
        .from('users')
        .select('*')
        .order('name'),
      supabase
        .from('performance_indicators')
        .select('user_email, supervisor')
    ]);

    const { data: users, error: usersError } = usersResult;
    const { data: performanceData, error: performanceError } = performanceResult;

    if (usersError) throw usersError;

    if (!users || users.length === 0) {
      return res.status(404).json({ error: 'Nenhum usuário encontrado.' });
    }

    // Criar mapa de supervisores por email
    const supervisorMap = {};
    if (performanceData && !performanceError) {
      performanceData.forEach(item => {
        if (item.user_email && item.supervisor) {
          supervisorMap[item.user_email.toLowerCase()] = item.supervisor;
        }
      });
    }

    // Mapear dados para manter compatibilidade com o frontend
    const mappedUsers = users.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.profile?.toLowerCase().trim(), // Normalizar role
      squad: user.squad,
      chamado: user.can_ticket,
      telefone: user.can_phone,
      chat: user.can_chat,
      supervisor: supervisorMap[user.email?.toLowerCase()] || null,
      remoto: false, // Campo removido da nova estrutura
    }));

    return res.status(200).json({ users: mappedUsers });
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    return res.status(500).json({ error: 'Erro ao buscar usuários.' });
  }
}