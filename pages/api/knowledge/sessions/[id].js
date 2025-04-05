// pages/api/knowledge/sessions/[id].js
import { updateKnowledgeSession, deleteKnowledgeSession } from '../../../../utils/supabase/knowledgeQueries';

export default async function handler(req, res) {
  // Extrair informações do usuário dos cookies
  const userId = req.cookies['user-id'];
  
  if (!userId) {
    return res.status(401).json({ error: 'Usuário não autenticado' });
  }

  const { method } = req;
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'ID da sessão é obrigatório' });
  }

  try {
    switch (method) {
      case 'PUT':
        const updates = req.body;
        
        if (Object.keys(updates).length === 0) {
          return res.status(400).json({ error: 'Nenhum dado fornecido para atualização' });
        }

        const updatedSession = await updateKnowledgeSession(id, updates);
        return res.status(200).json(updatedSession);

      case 'DELETE':
        await deleteKnowledgeSession(id);
        return res.status(200).json({ success: true });

      default:
        res.setHeader('Allow', ['PUT', 'DELETE']);
        return res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error('Erro ao processar requisição de sessão:', error);
    return res.status(500).json({ 
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
}