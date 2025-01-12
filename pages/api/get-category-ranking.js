import { supabase } from '../../utils/supabaseClient';

export default async function handler(req, res) {
  const { analystId, period } = req.query;

  if (!analystId) {
    return res.status(400).json({ 
      error: 'ID do analista é obrigatório e deve ser válido.',
      status: 'error' 
    });
  }

  try {
    // Consulta os registros de ajuda do analista
    const { data: helpRequests, error: helpError } = await supabase
      .from('help_requests')
      .select('category_id, request_date')
      .eq('analyst_id', analystId.trim()); // Garantir que não há espaços

    // Console.log para debug
    console.log('Total de registros para categorias:', helpRequests?.length || 0);

    if (helpError) throw helpError;

    if (!helpRequests || helpRequests.length === 0) {
      return res.status(200).json({ 
        categories: [],
        status: 'success'
      });
    }

    // Consulta todas as categorias para mapear ID -> Nome
    const { data: categories, error: categoryError } = await supabase
      .from('categories')
      .select('id, name');

    if (categoryError) throw categoryError;

    if (!categories || categories.length === 0) {
      return res.status(200).json({ 
        categories: [],
        message: 'Nenhuma categoria encontrada',
        status: 'success'
      });
    }

    // Criar mapa de categorias com validação
    const categoryMap = Object.fromEntries(
      categories.map(cat => [cat.id, cat.name || 'Categoria sem nome'])
    );

    // Ajuste de timezone e datas
    const brtDate = new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" });
    const currentDate = new Date(brtDate);

    // Calcular período de filtro (padrão: últimos 30 dias)
    const filterDays = period ? parseInt(period, 10) : 30;
    const filterDate = new Date(currentDate);
    filterDate.setDate(filterDate.getDate() - filterDays);

    // Contagem de todas as categorias dentro do período
    const categoryCounts = helpRequests.reduce((acc, { category_id, request_date }) => {
      if (!request_date || !category_id) return acc;

      try {
        const [year, month, day] = request_date.split('-').map(Number);
        
        // Validar componentes da data
        if (!year || !month || !day) return acc;
        
        const requestDate = new Date(year, month - 1, day);

        // Verificar se a data está dentro do período de filtro
        if (requestDate >= filterDate && requestDate <= currentDate) {
          acc[category_id] = (acc[category_id] || 0) + 1;
        }

      } catch (dateError) {
        console.error('Erro ao processar data:', dateError, 'para categoria:', category_id);
      }

      return acc;
    }, {});

    // Ordenar e pegar as Top 10 categorias
    const sortedCategories = Object.entries(categoryCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([id, count]) => ({
        id,
        name: categoryMap[id] || 'Categoria não encontrada',
        count,
        alertThreshold: count > 50 // Flag para alertas de knowledge base
      }));

    // Adicionar metadados à resposta
    const response = {
      categories: sortedCategories,
      metadata: {
        totalCategories: Object.keys(categoryCounts).length,
        periodDays: filterDays,
        periodStart: filterDate.toISOString(),
        periodEnd: currentDate.toISOString()
      },
      status: 'success'
    };

    res.status(200).json(response);

  } catch (error) {
    console.error('Erro ao obter ranking de categorias:', error);
    return res.status(500).json({ 
      error: 'Erro ao obter ranking de categorias.',
      details: error.message,
      status: 'error'
    });
  }
}