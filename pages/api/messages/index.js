import { supabase } from '../../../utils/supabase';

export default async function handler(req, res) {
  const { method } = req;
  const userId = req.cookies['user-id'];

  if (!userId) {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  switch (method) {
    case 'GET':
      try {
        const { isPrivate, searchTerm, tags } = req.query;
        let query = supabase
          .from('messages')
          .select(`
            *,
            tags (id, name),
            message_likes (user_id)
          `);

        // Filtrar por privacidade
        if (isPrivate === 'true') {
          query = query.eq('user_id', userId).eq('is_private', true);
        } else {
          query = query.eq('is_shared', true);
        }

        // Aplicar busca por termo
        if (searchTerm) {
          query = query.or(`title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%`);
        }

        // Filtrar por tags
        if (tags && tags.length > 0) {
          const tagArray = Array.isArray(tags) ? tags : [tags];
          query = query.contains('tags', tagArray);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) throw error;

        // Formatar os dados para incluir informações sobre likes
        const formattedData = data.map(message => ({
          ...message,
          liked_by_user: message.message_likes?.some(like => like.user_id === userId) || false,
          tags: message.tags.map(tag => tag.name)
        }));

        return res.status(200).json(formattedData);
      } catch (error) {
        console.error('Error fetching messages:', error);
        return res.status(500).json({ error: 'Error ao buscar mensagens' });
      }

    case 'POST':
      try {
        const { title, content, is_private, is_shared, tags } = req.body;

        // Validar dados obrigatórios
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

        // Se houver tags, criar as relações
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

    case 'PUT':
      try {
        const { id, title, content, is_private, is_shared, tags } = req.body;

        // Validar dados obrigatórios
        if (!id || !title || !content) {
          return res.status(400).json({ error: 'ID, título e conteúdo são obrigatórios' });
        }

        // Verificar se o usuário é dono da mensagem
        const { data: existingMessage } = await supabase
          .from('messages')
          .select()
          .eq('id', id)
          .single();

        if (existingMessage.user_id !== userId) {
          return res.status(403).json({ error: 'Não autorizado a editar esta mensagem' });
        }

        // Atualizar a mensagem
        const { data: message, error: messageError } = await supabase
          .from('messages')
          .update({
            title,
            content,
            is_private: is_private || false,
            is_shared: is_shared || true,
            updated_at: new Date()
          })
          .eq('id', id)
          .select()
          .single();

        if (messageError) throw messageError;

        // Atualizar tags
        if (tags) {
          // Remover tags antigas
          await supabase
            .from('message_tags')
            .delete()
            .eq('message_id', id);

          // Adicionar novas tags
          const messageTags = tags.map(tagId => ({
            message_id: id,
            tag_id: tagId
          }));

          const { error: tagError } = await supabase
            .from('message_tags')
            .insert(messageTags);

          if (tagError) throw tagError;
        }

        return res.status(200).json(message);
      } catch (error) {
        console.error('Error updating message:', error);
        return res.status(500).json({ error: 'Erro ao atualizar mensagem' });
      }

    case 'DELETE':
      try {
        const { id } = req.query;

        if (!id) {
          return res.status(400).json({ error: 'ID é obrigatório' });
        }

        // Verificar se o usuário é dono da mensagem
        const { data: existingMessage } = await supabase
          .from('messages')
          .select()
          .eq('id', id)
          .single();

        if (existingMessage.user_id !== userId) {
          return res.status(403).json({ error: 'Não autorizado a deletar esta mensagem' });
        }

        const { error } = await supabase
          .from('messages')
          .delete()
          .eq('id', id);

        if (error) throw error;

        return res.status(200).json({ message: 'Mensagem deletada com sucesso' });
      } catch (error) {
        console.error('Error deleting message:', error);
        return res.status(500).json({ error: 'Erro ao deletar mensagem' });
      }

    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      return res.status(405).end(`Method ${method} Not Allowed`);
  }
}