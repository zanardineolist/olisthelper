import { getUserPerformanceByEmail } from '../../utils/supabase/performanceQueriesNew';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { userEmail } = req.query;

  if (!userEmail) {
    return res.status(400).json({ error: 'E-mail do usuário é obrigatório' });
  }

  try {
    const performanceData = await getUserPerformanceByEmail(userEmail);
    return res.status(200).json(performanceData);
  } catch (error) {
    console.error('Erro ao obter dados de performance:', error);
    return res.status(500).json({ 
      error: error.message || 'Erro interno do servidor ao obter dados de performance.' 
    });
  }
}
