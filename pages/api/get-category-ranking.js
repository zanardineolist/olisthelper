// pages/api/get-category-ranking.js
import { getCategoryRanking } from '../../utils/supabase/helpQueries';

export default async function handler(req, res) {
  const { analystId, startDate, endDate } = req.query;

  if (!analystId) {
    return res.status(400).json({ error: 'ID do analista é obrigatório' });
  }

  try {
    const data = await getCategoryRanking(analystId, startDate, endDate);
    res.status(200).json(data);
  } catch (error) {
    console.error('Erro ao obter ranking de categorias:', error);
    res.status(500).json({ error: 'Erro ao obter registros das categorias.' });
  }
}