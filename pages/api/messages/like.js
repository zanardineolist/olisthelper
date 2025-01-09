import { supabase } from '../../../utils/supabase';

export default async function handler(req, res) {
  const { method } = req;
  const userId = req.cookies['user-id'];

  if (!userId) {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  if (method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${method} Not Allowed`);
  }

  try {
    const { messageId } = req.body;

    if (!messageId) {
      return res.status(400).json({ error: 'ID da mensagem é obrigatório' });
    }

    // Verificar se já existe um like
    const { data: existingLike } = await supabase
      .from('message_likes')
      .select()
      .eq('message_id', messageId)
      .eq('user_id', userId)
      .single();

    if (existingLike) {
      // Se já existe, remove o like
      const { error: deleteError } = await supabase
        .from('message_likes')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', userId);

      if (deleteError) throw deleteError;

      return res.status(200).json({ 
        message: 'Like removido com sucesso',
        liked: false
      });
    } else {
      // Se não existe, adiciona o like
      const { error: insertError } = await supabase
        .from('message_likes')
        .insert([{
          message_id: messageId,
          user_id: userId,
          created_at: new Date().toISOString()
        }]);

      if (insertError) throw insertError;

      return res.status(200).json({ 
        message: 'Like adicionado com sucesso',
        liked: true
      });
    }
  } catch (error) {
    console.error('Error managing like:', error);
    return res.status(500).json({ error: 'Erro ao gerenciar like' });
  }
}