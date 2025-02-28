import { getAnalystRecords } from '../../utils/supabase/helpQueries';

export default async function handler(req, res) {
  const { analystId, mode, filter, startDate, endDate } = req.query;

  if (!analystId) {
    return res.status(400).json({ error: 'ID do analista é obrigatório' });
  }

  try {
    // Se temos startDate e endDate, vamos lidar com eles de forma especial
    if (startDate && endDate) {
      // Vamos implementar uma lógica específica para intervalos de datas personalizados
      // Neste caso, passamos startDate como filtro e ajustamos a lógica dentro de getAnalystRecords
      const data = await getAnalystRecords(analystId, startDate, mode);
      if (!data) {
        return res.status(404).json({ error: 'Nenhum registro encontrado' });
      }
      return res.status(200).json(data);
    } else {
      // Comportamento original usando o parâmetro de filtro
      const data = await getAnalystRecords(analystId, filter, mode);
      if (!data) {
        return res.status(404).json({ error: 'Nenhum registro encontrado' });
      }
      return res.status(200).json(data);
    }
  } catch (error) {
    console.error('Erro ao obter registros do analista:', error);
    res.status(500).json({ error: 'Erro ao obter registros.' });
  }
}