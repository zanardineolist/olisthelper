// pages/api/get-analyst-leaderboard.js
import { getAnalystLeaderboard } from '../../utils/supabase/helpQueries';

export default async function handler(req, res) {
  const { analystId, startDate, endDate } = req.query;

  if (!analystId) {
    return res.status(400).json({ error: 'ID do analista é obrigatório' });
  }

  try {
    const data = await getAnalystLeaderboard(analystId, startDate, endDate);
    res.status(200).json(data);
  } catch (error) {
    console.error('Erro ao obter leaderboard:', error);
    res.status(500).json({ error: 'Erro ao obter registros.' });
  }
}