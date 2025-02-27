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

    const isFavorite = await toggleFavorite(userId, messageId);
    
    return res.status(200).json({ 
      success: true,
      isFavorite,
      message: isFavorite ? 'Mensagem favoritada' : 'Mensagem desfavoritada' 
    });
  } catch (error) {
    console.error('Erro ao processar requisição:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}