import { toggleFavorite, isFavorite } from '../../../utils/supabase/sharedResponsesQueries';

export default async function handler(req, res) {
  const userId = req.cookies['user-id'];
  if (!userId) {
    return res.status(401).json({ error: 'Usuário não autenticado' });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { messageId } = req.body;
    
    if (!messageId) {
      return res.status(400).json({ error: 'ID da mensagem é obrigatório' });
    }

    const currentState = await isFavorite(userId, messageId);
    const success = await toggleFavorite(userId, messageId, !currentState);

    if (!success) {
      return res.status(400).json({ error: 'Erro ao atualizar favorito' });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Erro ao processar requisição:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}