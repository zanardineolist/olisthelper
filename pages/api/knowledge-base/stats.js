import { supabaseAdmin } from '../../../utils/supabase/supabaseClient';

export default async function handler(req, res) {
  // Extrair informações do usuário dos cookies
  const userId = req.cookies['user-id'];
  
  if (!userId) {
    return res.status(401).json({ error: 'Usuário não autenticado' });
  }

  const { method } = req;

  if (method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${method} Not Allowed`);
  }

  try {
    const { data: stats, error: statsError } = await supabaseAdmin
      .rpc('get_user_knowledge_base_stats', {
        user_uuid: userId
      });

    if (statsError) {
      console.error('Erro ao obter estatísticas:', statsError);
      throw statsError;
    }

    // A função retorna um array, pegamos o primeiro item
    const userStats = stats && stats.length > 0 ? stats[0] : {
      total_entries: 0,
      total_favorites: 0,
      total_views: 0,
      most_viewed_entry_id: null,
      most_used_tags: [],
      categories_count: 0
    };

    return res.status(200).json({ stats: userStats });
  } catch (error) {
    console.error('Erro ao processar requisição:', error);
    return res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    });
  }
} 