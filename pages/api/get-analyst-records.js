// pages/api/get-analyst-records.js
import { getAnalystRecords } from '../../utils/supabase/helpQueries';

export default async function handler(req, res) {
  const { analystId, mode, filter } = req.query;

  if (!analystId) {
    return res.status(400).json({ error: 'ID do analista é obrigatório' });
  }

  try {
    const data = await getAnalystRecords(analystId, filter, mode);
    if (!data) {
      return res.status(404).json({ error: 'Nenhum registro encontrado' });
    }

    res.status(200).json(data);
  } catch (error) {
    console.error('Erro ao obter registros do analista:', error);
    res.status(500).json({ error: 'Erro ao obter registros.' });
  }
}