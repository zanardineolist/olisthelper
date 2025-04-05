// pages/api/knowledge/sessions.js
import { getUserKnowledgeSessions, addKnowledgeSession } from '../../../utils/supabase/knowledgeQueries';

export default async function handler(req, res) {
  // Extrair informações do usuário dos cookies
  const userId = req.cookies['user-id'];
  
  if (!userId) {
    return res.status(401).json({ error: 'Usuário não autenticado' });
  }

  const { method } = req;

  try {
    switch (method) {
      case 'GET':
        const sessions = await getUserKnowledgeSessions(userId);
        return res.status(200).json({ sessions });

      case 'POST':
        const { name, description } = req.body;

        if (!name) {
          return res.status(400).json({ error: 'Nome da sessão é obrigatório' });
        }

        const newSession = await addKnowledgeSession({
          userId,
          name,
          description: description || ''
        });

        return res.status(201).json(newSession);

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error('Erro ao processar requisição:', error);
    return res.status(500).json({ error: 'Erro interno do servidor', message: error.message });
  }
}