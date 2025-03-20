import { getUserPerformance } from '../../utils/supabase/performanceQueries';

export default async function handler(req, res) {
  const { userEmail } = req.query;

  if (!userEmail) {
    return res.status(400).json({ error: 'E-mail do usuário é obrigatório' });
  }

  try {
    const performanceData = await getUserPerformance(userEmail);
    return res.status(200).json(performanceData);
  } catch (error) {
    console.error('Erro ao obter dados de desempenho:', error);
    return res.status(500).json({ error: 'Erro ao obter dados de desempenho.' });
  }
}
