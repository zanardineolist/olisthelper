import { getFavoriteResponses } from '../../../utils/supabase/sharedResponsesQueries';

export default async function handler(req, res) {
  const userId = req.cookies['user-id'];
  if (!userId) {
    return res.status(401).json({ error: 'Usuário não autenticado' });
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const messages = await getFavoriteResponses(userId);
    return res.status(200).json({ messages });
  } catch (error) {
    console.error('Erro ao processar requisição:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}