// pages/api/knowledge/index.js
import { getUserKnowledgeItems, addKnowledgeItem } from '../../../utils/supabase/knowledgeQueries';

export default async function handler(req, res) {
  // Extrair informações do usuário dos cookies
  const userId = req.cookies['user-id'];
  
  if (!userId) {
    return res.status(401).json({ error: 'Usuário não autenticado' });
  }

  const { method } = req;
  const { searchTerm, tags, sessionId } = req.query;
  const tagsArray = tags ? tags.split(',').filter(tag => tag.trim()) : [];

  try {
    switch (method) {
      case 'GET':
        const items = await getUserKnowledgeItems(userId, searchTerm, tagsArray, sessionId);
        
        // Informações para paginação (implementação básica)
        const total = items.length;
        const itemsPerPage = 20;
        const totalPages = Math.ceil(total / itemsPerPage);
        
        return res.status(200).json({ 
          items,
          total,
          totalPages
        });

      case 'POST':
        const { title, description, tags, sessionId, ticketLink } = req.body;

        if (!title || !description) {
          return res.status(400).json({ error: 'Título e descrição são obrigatórios' });
        }

        const newItem = await addKnowledgeItem({
          userId,
          title,
          description,
          tags: tags || [],
          sessionId: sessionId || null,
          ticketLink: ticketLink || null
        });

        return res.status(201).json(newItem);

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error('Erro ao processar requisição:', error);
    return res.status(500).json({ 
      error: 'Erro interno do servidor', 
      message: error.message 
    });
  }
}