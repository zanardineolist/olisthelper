import { getMessageById } from '../../../../utils/supabase/sharedResponsesQueries';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  const userId = req.cookies['user-id'] || null;

  try {
    const message = await getMessageById(id, userId);
    
    if (!message) {
      return res.status(404).json({ error: 'Mensagem não encontrada ou não é pública' });
    }

    return res.status(200).json({ message });
  } catch (error) {
    console.error('Erro ao buscar mensagem:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}