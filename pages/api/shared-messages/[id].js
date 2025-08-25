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
        const { title, content, isPublic, tags, command } = req.body;
        
        if (!title || !content) {
          return res.status(400).json({ error: 'Título e conteúdo são obrigatórios' });
        }

        // Validar formato do comando se fornecido
        if (command && (!/^\/[a-zA-Z0-9_-]+$/.test(command) || command.length < 2 || command.length > 50)) {
          return res.status(400).json({ error: 'Comando deve começar com "/" e conter apenas letras, números, _ ou -' });
        }

        const updatedMessage = await updateResponse(id, {
          title,
          content,
          tags,
          isPublic,
          command
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