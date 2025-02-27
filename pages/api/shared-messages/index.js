import {
  getAllResponses,
  getUserResponses,
  addResponse
} from '../../../utils/supabase/sharedResponsesQueries';

export default async function handler(req, res) {
  // Extrair informações do usuário dos cookies
  const userId = req.cookies['user-id'];
  
  if (!userId) {
    return res.status(401).json({ error: 'Usuário não autenticado' });
  }

  const { method } = req;
  const { searchTerm, tags } = req.query;
  const tagsArray = tags ? tags.split(',') : [];

  try {
    switch (method) {
      case 'GET':
        const messages = await getAllResponses(userId, searchTerm, tagsArray);
        return res.status(200).json({ messages });

      case 'POST':
        const { title, content, isPublic } = req.body;
        const messageTags = req.body.tags || [];

        if (!title || !content) {
          return res.status(400).json({ error: 'Título e conteúdo são obrigatórios' });
        }

        const newMessage = await addResponse({
          userId,
          title,
          content,
          tags: messageTags,
          isPublic
        });

        return res.status(201).json(newMessage);

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error('Erro ao processar requisição:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}