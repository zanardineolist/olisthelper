import { supabase } from '../../utils/supabaseClient';

// Função para validar se o analystId é um UUID válido
const isValidUUID = (id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id);

export default async function handler(req, res) {
  const { analystId } = req.query;

  if (!analystId || !isValidUUID(analystId.trim())) {
    return res.status(400).json({
      error: 'ID do analista é inválido ou não informado.',
      status: 'error'
    });
  }

  try {
    console.log('Iniciando busca de categorias para analista:', analystId);

    const { data: helpRequests, error: helpError } = await supabase
      .from('help_requests')
      .select('category_id, request_date')
      .eq('analyst_id', analystId.trim());

    if (helpError) {
      console.error('Erro na consulta de help_requests:', helpError);
      throw helpError;
    }

    if (!helpRequests || helpRequests.length === 0) {
      console.log('Nenhum registro encontrado');
      return res.status(200).json({
        categories: [],
        status: 'success'
      });
    }

    const { data: categories, error: categoryError } = await supabase
      .from('categories')
      .select('id, name');

    if (categoryError) {
      console.error('Erro na consulta de categories:', categoryError);
      throw categoryError;
    }

    const categoryMap = {};
    categories.forEach(cat => {
      if (cat.id) {
        categoryMap[cat.id] = cat.name || 'Categoria sem nome';
      }
    });

    const categoryCounts = {};
    helpRequests.forEach(({ category_id, request_date }) => {
      if (category_id) {
        categoryCounts[category_id] = (categoryCounts[category_id] || 0) + 1;
      }
    });

    const sortedCategories = Object.entries(categoryCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([id, count]) => ({
        id,
        name: categoryMap[id] || 'Categoria não encontrada',
        count
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
