import { supabase } from '../../../utils/supabase';

export default async function handler(req, res) {
  const { method } = req;
  const userId = req.cookies['user-id'];

  if (!userId) {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  if (method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${method} Not Allowed`);
  }

  try {
    // Buscar mensagens mais curtidas
    const { data: popularMessages, error } = await supabase
      .from('messages')
      .select(`
        *,
        tags (id, name),
        message_likes (user_id)
      `)
      .eq('is_shared', true)
      .order('likes_count', { ascending: false })
      .limit(10);

    if (error) throw error;

    // Formatar os dados
    const formattedData = popularMessages.map(message => ({
      ...message,
      liked_by_user: message.message_likes?.some(like => like.user_id === userId) || false,
      tags: message.tags.map(tag => tag.name)
    }));

    return res.status(200).json(formattedData);
  } catch (error) {
    console.error('Error fetching popular messages:', error);
    return res.status(500).json({ error: 'Erro ao buscar mensagens populares' });
  }
}