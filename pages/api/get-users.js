import { supabase } from '../../utils/supabase';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Buscar todos os usuários ativos
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .eq('active', true)
      .order('name');

    if (error) {
      throw error;
    }

    // Formatar os dados para manter compatibilidade com a interface existente
    const formattedUsers = users.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      squad: user.squad || null,
      chamado: user.chamado || false,
      telefone: user.telefone || false,
      chat: user.chat || false,
      remoto: user.remoto || false,
      active: user.active
    }));

    return res.status(200).json({ users: formattedUsers });
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    return res.status(500).json({ 
      error: 'Erro ao buscar usuários. Verifique suas credenciais e a configuração do Supabase.' 
    });
  }
}