import { supabase } from '../../utils/supabaseClient';

export default async function handler(req, res) {
  const { analystId } = req.query;

  if (!analystId) {
    return res.status(400).json({ 
      error: 'ID do analista é obrigatório e deve ser válido.',
      status: 'error' 
    });
  }

  try {
    console.log('Iniciando busca de categorias para analista:', analystId);

    // Usar ilike para correspondência case-insensitive
    const { data: helpRequests, error: helpError } = await supabase
      .from('help_requests')
      .select('category_id, request_date')
      .ilike('analyst_id', analystId.trim());

    console.log('Total de registros encontrados:', helpRequests?.length || 0);

    if (helpError) {
      console.error('Erro na consulta de help_requests:', helpError);
      throw helpError;
    }

    if (!helpRequests || helpRequests.length === 0) {
      return res.status(200).json({ 
        categories: [],
        status: 'success'
      });
    }

    // Buscar todas as categorias
    const { data: categories, error: categoryError } = await supabase
      .from('categories')
      .select('id, name');

    if (categoryError) {
      console.error('Erro na consulta de categories:', categoryError);
      throw categoryError;
    }

    const categoryMap = Object.fromEntries(
      categories.map(cat => [cat.id, cat.name || 'Categoria sem nome'])
    );

    // Contagem simples de todas as categorias (sem filtro de data)
    const categoryCounts = helpRequests.reduce((acc, { category_id }) => {
      if (category_id) {
        acc[category_id] = (acc[category_id] || 0) + 1;
      }
      return acc;
    }, {});

    // Ordenar e pegar top 10
    const sortedCategories = Object.entries(categoryCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([id, count]) => ({
        id,
        name: categoryMap[id] || 'Categoria não encontrada',
        count,
        alertThreshold: count > 50
      }));

    console.log('Categorias processadas:', sortedCategories.length);

    return res.status(200).json({
      categories: sortedCategories,
      status: 'success'
    });

  } catch (error) {
    console.error('Erro ao obter ranking de categorias:', error);
    return res.status(500).json({ 
      error: 'Erro ao obter ranking de categorias.',
      details: error.message,
      status: 'error'
    });
  }
}