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

    // Usar eq para UUID
    const { data: helpRequests, error: helpError } = await supabase
      .from('help_requests')
      .select('category_id, request_date')
      .eq('analyst_id', analystId.trim());

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

    // Buscar categorias
    const { data: categories, error: categoryError } = await supabase
      .from('categories')
      .select('id, name');

    if (categoryError) {
      console.error('Erro na consulta de categories:', categoryError);
      throw categoryError;
    }

    // Criar mapa de categorias
    const categoryMap = {};
    categories?.forEach(cat => {
      if (cat.id) {
        categoryMap[cat.id] = cat.name || 'Categoria sem nome';
      }
    });

    // Contar ocorrências de cada categoria
    const categoryCounts = {};
    helpRequests.forEach(({ category_id }) => {
      if (category_id) {
        categoryCounts[category_id] = (categoryCounts[category_id] || 0) + 1;
      }
    });

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
      metadata: {
        totalCategories: Object.keys(categoryCounts).length,
        totalRequests: helpRequests.length
      },
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