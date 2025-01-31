import { supabaseAdmin } from '../../../utils/supabase/supabaseClient';
import { updateResponse, deleteResponse } from '../../../utils/supabase/sharedResponsesQueries';

export default async function handler(req, res) {
  // Log para depuração
  console.log('Requisição recebida:', {
    method: req.method,
    query: req.query,
    body: req.body,
    cookies: req.cookies
  });

  // Verificação de autenticação com mais detalhes
  const userId = req.cookies['user-id'];
  console.log('UserID recebido:', userId);

  if (!userId) {
    console.warn('Tentativa de acesso sem autenticação');
    return res.status(401).json({ error: 'Usuário não autenticado' });
  }

  const { id } = req.query;
  const { method } = req;

  // Validação adicional do ID
  if (!id) {
    console.error('ID da mensagem não fornecido');
    return res.status(400).json({ error: 'ID da mensagem é obrigatório' });
  }

  try {
    switch (method) {
      case 'PUT':
        const { title, content, isPublic, tags } = req.body;
        
        // Validações mais robustas
        if (!title || title.trim() === '') {
          return res.status(400).json({ error: 'Título é obrigatório' });
        }

        if (!content || content.trim() === '') {
          return res.status(400).json({ error: 'Conteúdo é obrigatório' });
        }

        // Verificar se o usuário tem permissão para editar
        const existingMessage = await supabaseAdmin
          .from('shared_responses')
          .select('user_id')
          .eq('id', id)
          .single();

        if (existingMessage.error || existingMessage.data.user_id !== userId) {
          console.warn(`Tentativa não autorizada de edição. User: ${userId}`);
          return res.status(403).json({ error: 'Você não tem permissão para editar esta mensagem' });
        }

        const updatedMessage = await updateResponse(id, {
          title: title.trim(),
          content: content.trim(),
          tags: tags || [],
          isPublic: !!isPublic
        });

        console.log('Mensagem atualizada:', updatedMessage);
        return res.status(200).json(updatedMessage);

      case 'DELETE':
        // Verificar se o usuário tem permissão para deletar
        const messageToDelete = await supabaseAdmin
          .from('shared_responses')
          .select('user_id')
          .eq('id', id)
          .single();

        console.log('Mensagem a ser deletada:', messageToDelete);

        if (messageToDelete.error) {
          console.error('Erro ao buscar mensagem:', messageToDelete.error);
          return res.status(404).json({ error: 'Mensagem não encontrada' });
        }

        if (messageToDelete.data.user_id !== userId) {
          console.warn(`Tentativa não autorizada de exclusão. User: ${userId}`);
          return res.status(403).json({ error: 'Você não tem permissão para excluir esta mensagem' });
        }

        const success = await deleteResponse(id);
        
        console.log('Resultado da exclusão:', success);

        if (!success) {
          return res.status(500).json({ error: 'Falha ao excluir a mensagem' });
        }

        return res.status(200).json({ message: 'Mensagem excluída com sucesso' });

      default:
        res.setHeader('Allow', ['PUT', 'DELETE']);
        return res.status(405).json({ 
          error: `Método ${method} não permitido`, 
          allowedMethods: ['PUT', 'DELETE'] 
        });
    }
  } catch (error) {
    console.error('Erro detalhado ao processar requisição:', error);
    return res.status(500).json({ 
      error: 'Erro interno do servidor', 
      details: error.message 
    });
  }
}