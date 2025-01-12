import { supabase } from '../../utils/supabaseClient';

export default async function handler(req, res) {
  const { analystId } = req.query;

  if (!analystId) {
    return res.status(400).json({ error: 'ID do analista é obrigatório e deve ser válido.' });
  }

  try {
    // Consulta os registros de ajuda do analista
    const { data: helpRequests, error: helpError } = await supabase
      .from('help_requests')
      .select('category_id, request_date')
      .eq('analyst_id', analystId);

    if (helpError) throw helpError;

    if (!helpRequests || helpRequests.length === 0) {
      return res.status(200).json({ categories: [] });
    }

    // Consulta todas as categorias para mapear ID -> Nome
    const { data: categories, error: categoryError } = await supabase
      .from('categories')
      .select('id, name');

    if (categoryError) throw categoryError;

    const categoryMap = Object.fromEntries(categories.map(cat => [cat.id, cat.name]));

    // Ajuste de timezone
    const brtDate = new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" });
    const currentDate = new Date(brtDate);

    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    // Contagem de categorias no mês atual
    const categoryCounts = helpRequests.reduce((acc, { category_id, request_date }) => {
      if (!request_date || !category_id) return acc;

      const [year, month, day] = request_date.split('-').map(Number);
      const date = new Date(year, month - 1, day);

      if (date.getMonth() + 1 === currentMonth && date.getFullYear() === currentYear) {
        acc[category_id] = (acc[category_id] || 0) + 1;
      }

      return acc;
    }, {});

    // Ordenar e pegar as Top 10 categorias
    const sortedCategories = Object.entries(categoryCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([id, count]) => ({
        name: categoryMap[id] || 'Categoria não encontrada',
        count,
      }));

    res.status(200).json({ categories: sortedCategories });

  } catch (error) {
    console.error('Erro ao obter ranking de categorias:', error);
    res.status(500).json({ error: 'Erro ao obter ranking de categorias.' });
  }
}
