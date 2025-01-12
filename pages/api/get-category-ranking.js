import { supabase } from '../../utils/supabaseClient';

export default async function handler(req, res) {
  const { analystId } = req.query;

  if (!analystId) {
    return res.status(400).json({ error: 'ID do analista é obrigatório e deve ser válido.' });
  }

  try {
    // Consulta ao Supabase para buscar categorias relacionadas ao analista
    const { data: helpRequests, error } = await supabase
      .from('help_requests')
      .select('category_id')
      .eq('analyst_id', analystId);

    if (error) throw error;

    if (!helpRequests || helpRequests.length === 0) {
      return res.status(200).json({ categories: [] });
    }

    // Contagem de ocorrências por categoria
    const categoryCounts = helpRequests.reduce((acc, { category_id }) => {
      acc[category_id] = (acc[category_id] || 0) + 1;
      return acc;
    }, {});

    // Ordenar as categorias e pegar as Top 10
    const sortedCategories = Object.entries(categoryCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([id, count]) => ({ id, count }));

    res.status(200).json({ categories: sortedCategories });
  } catch (error) {
    console.error('Erro ao obter ranking de categorias:', error);
    res.status(500).json({ error: 'Erro ao obter ranking de categorias.' });
  }
}
