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
    console.log('Iniciando busca de ranking de categorias para analista:', analystId);

    // Buscar registros de ajuda com associação direta à tabela de categorias
    const { data: helpRequests, error: helpError } = await supabase
      .from('help_requests')
      .select(`
        category_id,
        categories (
          name
        )
      `)
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

    // Contar ocorrências por categoria
    const categoryCounts = {};
    helpRequests.forEach(({ category_id, categories }) => {
      const categoryName = categories?.name || 'Categoria não encontrada';
      if (category_id) {
        if (!categoryCounts[category_id]) {
          categoryCounts[category_id] = {
            id: category_id,
            name: categoryName,
            count: 0
          };
        }
        categoryCounts[category_id].count++;
      }
    });

    // Ordenar categorias pela contagem e limitar ao Top 10
    const sortedCategories = Object.values(categoryCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    console.log('Ranking de categorias processado:', sortedCategories);

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
