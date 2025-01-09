// pages/api/messages/index.js
import { supabase } from '../../../utils/supabase';

export default async function handler(req, res) {
  const { method } = req;
  const userId = req.cookies['user-id'];

  if (!userId) {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  // Configurar o user_id no contexto do Supabase
  await supabase.rpc('set_claim', { name: 'request.user_id', value: userId });

  switch (method) {
    case 'GET':
      try {
        const { isPrivate, searchTerm, tags } = req.query;
        
        let query = supabase
          .from('messages')
          .select(`
            id,
            title,
            content,
            user_id,
            is_private,
            is_shared,
            created_at,
            updated_at,
            users (name),
            message_tags!inner (
              tags (
                id,
                name
              )
            ),
            message_likes (
              user_id
            )
          `);

        // Filtrar por privacidade
        if (isPrivate === 'true') {
          query = query.eq('user_id', userId);
        } else {
          query = query.eq('is_shared', true);
        }

        // Aplicar busca por termo
        if (searchTerm) {
          query = query.or(`title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%`);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) throw error;

        // Formatar os dados
        const formattedData = data.map(message => ({
          ...message,
          author_name: message.users?.name,
          tags: message.message_tags
            ?.map(mt => mt.tags?.name)
            .filter(Boolean),
          liked_by_user: message.message_likes?.some(like => like.user_id === userId) || false,
          likes_count: message.message_likes?.length || 0
        }));

        return res.status(200).json(formattedData);
      } catch (error) {
        console.error('Error fetching messages:', error);
        return res.status(500).json({ error: 'Erro ao buscar mensagens' });
      }

    case 'POST':
      try {
        const { title, content, is_private, is_shared, tags } = req.body;

        if (!title || !content) {
          return res.status(400).json({ error: 'Título e conteúdo são obrigatórios' });
        }

        // Criar a mensagem
        const { data: message, error: messageError } = await supabase
          .from('messages')
          .insert([{
            title,
            content,
            user_id: userId,
            is_private: is_private || false,
            is_shared: is_shared || true
          }])
          .select()
          .single();

        if (messageError) throw messageError;

        // Adicionar tags se houver
        if (tags && tags.length > 0) {
          const messageTags = tags.map(tagId => ({
            message_id: message.id,
            tag_id: tagId
          }));

          const { error: tagError } = await supabase
            .from('message_tags')
            .insert(messageTags);

          if (tagError) throw tagError;
        }

        return res.status(201).json(message);
      } catch (error) {
        console.error('Error creating message:', error);
        return res.status(500).json({ error: 'Erro ao criar mensagem' });
      }

    default:
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).end(`Method ${method} Not Allowed`);
  }
}