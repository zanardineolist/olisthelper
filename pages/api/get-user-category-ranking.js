import { getUserCategoryRanking } from '../../utils/supabase/helpQueries';

export default async function handler(req, res) {
  const { userEmail, startDate, endDate } = req.query;

  if (!userEmail || userEmail === 'undefined') {
    return res.status(400).json({ error: 'E-mail do usuário é obrigatório e deve ser válido.' });
  }

  try {
    const categoryRanking = await getUserCategoryRanking(userEmail, startDate, endDate);
    res.status(200).json(categoryRanking);
  } catch (error) {
    console.error('Erro ao obter ranking de categorias:', error);
    res.status(500).json({ error: 'Erro ao obter ranking de categorias.' });
  }
}