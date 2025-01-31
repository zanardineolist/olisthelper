import { updateResponse, deleteResponse } from '../../../utils/supabase/sharedResponsesQueries';

export default async function handler(req, res) {
  const userId = req.cookies['user-id'];
  if (!userId) {
    return res.status(401).json({ error: 'Usuário não autenticado' });
  }

  const { id } = req.query;
  const { method } = req;

  try {
    switch (method) {
      case 'PUT':
        const { title, content, isPublic, tags } = req.body;
        
        if (!title || !content) {
          return res.status(400).json({ error: 'Título e conteúdo são obrigatórios' });
        }

        const updatedMessage = await updateResponse(id, {
          title,
          content,
          tags,
          isPublic
        });

        return res.status(200).json(updatedMessage);

      case 'DELETE':
        const success = await deleteResponse(id);
        if (!success) {
          return res.status(404).json({ error: 'Mensagem não encontrada' });
        }
        return res.status(200).json({ message: 'Mensagem excluída com sucesso' });

      default:
        res.setHeader('Allow', ['PUT', 'DELETE']);
        return res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error('Erro ao processar requisição:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}