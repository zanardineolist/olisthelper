import { supabase, setSupabaseContext } from '../../../utils/supabase';

export default async function handler(req, res) {
  const { method } = req;
  const userId = req.cookies['user-id'];
  const userName = req.cookies['user-name'];

  if (!userId) {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  // Configurar contexto RLS
  try {
    await setSupabaseContext(userId);
  } catch (error) {
    console.error('Error setting Supabase context:', error);
    return res.status(401).json({ error: 'Erro de autenticação' });
  }

  switch (method) {
    case 'GET':
      try {
        const { isPrivate, searchTerm, tags } = req.query;
        
        let query = supabase
          .from('messages')
          .select(`
            *,
            users!messages_user_id_fkey (
              name
            ),
            message_tags (
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

        // Aplicar filtro por tags
        if (tags) {
          const tagIds = tags.split(',');
          query = query.contains('message_tags.tags.id', tagIds);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) throw error;

        // Formatar os dados
        const formattedData = data.map(message => ({
          id: message.id,
          title: message.title,
          content: message.content,
          user_id: message.user_id,
          author_name: message.users?.name || userName,
          is_private: message.is_private,
          is_shared: message.is_shared,
          created_at: message.created_at,
          updated_at: message.updated_at,
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

        // Validação dos campos
        if (!title?.trim() || !content?.trim()) {
          return res.status(400).json({ error: 'Título e conteúdo são obrigatórios' });
        }

        if (title.length > 100) {
          return res.status(400).json({ error: 'Título muito longo (máximo 100 caracteres)' });
        }

        if (content.length > 2000) {
          return res.status(400).json({ error: 'Conteúdo muito longo (máximo 2000 caracteres)' });
        }

        // Criar a mensagem
        const { data: message, error: messageError } = await supabase
          .from('messages')
          .insert([{
            title: title.trim(),
            content: content.trim(),
            user_id: userId,
            is_private: is_private || false,
            is_shared: is_shared || true
          }])
          .select()
          .single();

        if (messageError) throw messageError;

        // Adicionar tags se houver
        if (tags?.length > 0) {
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
        const { id } = req.query;
        const { title, content, is_private, is_shared, tags } = req.body;

        if (!id) {
          return res.status(400).json({ error: 'ID da mensagem é obrigatório' });
        }

        // Validação dos campos
        if (!title?.trim() || !content?.trim()) {
          return res.status(400).json({ error: 'Título e conteúdo são obrigatórios' });
        }

        // Verificar se o usuário é o dono da mensagem
        const { data: existingMessage } = await supabase
          .from('messages')
          .select()
          .eq('id', id)
          .single();

        if (!existingMessage || existingMessage.user_id !== userId) {
          return res.status(403).json({ error: 'Não autorizado a editar esta mensagem' });
        }

        // Atualizar a mensagem
        const { error: updateError } = await supabase
          .from('messages')
          .update({
            title: title.trim(),
            content: content.trim(),
            is_private: is_private || false,
            is_shared: is_shared || true,
            updated_at: new Date().toISOString()
          })
          .eq('id', id);

        if (updateError) throw updateError;

        // Atualizar tags
        if (tags) {
          // Remover tags antigas
          await supabase
            .from('message_tags')
            .delete()
            .eq('message_id', id);

          // Adicionar novas tags
          if (tags.length > 0) {
            const messageTags = tags.map(tagId => ({
              message_id: id,
              tag_id: tagId
            }));

            const { error: tagError } = await supabase
              .from('message_tags')
              .insert(messageTags);

            if (tagError) throw tagError;
          }
        }

        return res.status(200).json({ message: 'Mensagem atualizada com sucesso' });
      } catch (error) {
        console.error('Error updating message:', error);
        return res.status(500).json({ error: 'Erro ao atualizar mensagem' });
      }

    case 'DELETE':
      try {
        const { id } = req.query;

        if (!id) {
          return res.status(400).json({ error: 'ID da mensagem é obrigatório' });
        }

        // Verificar se o usuário é o dono da mensagem
        const { data: message } = await supabase
          .from('messages')
          .select()
          .eq('id', id)
          .single();

        if (!message || message.user_id !== userId) {
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