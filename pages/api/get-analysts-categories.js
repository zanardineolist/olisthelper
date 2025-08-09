import { getAllCategories, getAllActiveUsers, supabaseAdmin } from '../../utils/supabase/supabaseClient';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';

export default async function handler(req, res) {
  try {
    // Exigir sessão válida
    const session = await getServerSession(req, res, authOptions);
    if (!session?.id) {
      return res.status(401).json({ error: 'Não autorizado' });
    }
    // Opcional: permitir apenas perfis que podem registrar ajuda
    const { data: me, error: meErr } = await supabaseAdmin
      .from('users')
      .select('id, can_register_help, profile')
      .eq('id', session.id)
      .single();
    if (meErr || !me) {
      return res.status(403).json({ error: 'Proibido' });
    }
    const allowedProfiles = ['analyst', 'tax'];
    const isAllowed = me.can_register_help || allowedProfiles.includes((me.profile || '').toLowerCase());
    if (!isAllowed) {
      return res.status(403).json({ error: 'Proibido' });
    }
    // Obter categorias do Supabase
    const categories = await getAllCategories();
    
    // Obter analistas do Supabase (usuários com perfil 'analyst' ou 'tax')
    const allUsers = await getAllActiveUsers();
    const analysts = allUsers
      .filter((user) => user.profile === 'analyst' || user.profile === 'tax')
      .map((user) => ({
        id: user.id,
        name: user.name,
      }));
    
    // Formatar categorias para manter compatibilidade com o frontend
    const formattedCategories = categories.map(category => category.name);

    res.status(200).json({ analysts, categories: formattedCategories });
  } catch (error) {

    res.status(500).json({ error: 'Erro ao carregar dados.' });
  }
}