import { supabase } from '../../utils/supabaseClient';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

// Configurar o timezone
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault("America/Sao_Paulo");

export default async function handler(req, res) {
  const { analystId } = req.query;

  if (!analystId || analystId.trim() === '') {
    console.log('Erro: ID do analista não fornecido.');
    return res.status(400).json({ error: 'ID do analista é obrigatório.' });
  }

  try {
    // Verificar se o analista existe
    const { data: analyst, error: analystError } = await supabase
      .from('users')
      .select('id')
      .eq('id', analystId.trim())
      .single();

    if (analystError || !analyst) {
      console.log('Erro: Analista não encontrado.');
      return res.status(404).json({ error: 'Analista não encontrado.' });
    }

    console.log(`Buscando ranking de categorias para o analista: ${analystId}`);

    // Buscar TODOS os registros do analista (sem filtro de data)
    const { data: helpRequests, error } = await supabase
      .from('help_requests')
      .select(`
        *,
        categories (
          id,
          name
        )
      `)
      .eq('analyst_id', analystId.trim());

    if (error) {
      console.error('Erro na consulta:', error);
      throw error;
    }

    if (!helpRequests || helpRequests.length === 0) {
      console.log('Nenhum registro encontrado.');
      return res.status(200).json({
        categories: [],
        metadata: {
          totalCategories: 0,
          totalRequests: 0,
          currentMonthRequests: 0
        }
      });
    }

    // Separar registros do mês atual para metadata
    const now = dayjs().tz("America/Sao_Paulo");
    const currentMonth = now.month() + 1;
    const currentYear = now.year();

    const currentMonthRequests = helpRequests.filter(({ request_date }) => {
      if (!request_date) return false;
      const [year, month] = request_date.split('-').map(num => parseInt(num, 10));
      return year === currentYear && month === currentMonth;
    });

    // Contar todas as categorias
    const categoryCounts = helpRequests.reduce((acc, request) => {
      const categoryId = request.category_id;
      const categoryName = request.categories?.name || 'Categoria não encontrada';
      
      if (!categoryId) return acc;
      
      if (!acc[categoryId]) {
        acc[categoryId] = {
          id: categoryId,
          name: categoryName,
          count: 0,
          currentMonthCount: 0
        };
      }
      
      acc[categoryId].count++;

      // Contar também ocorrências do mês atual
      if (request.request_date) {
        const [year, month] = request.request_date.split('-').map(num => parseInt(num, 10));
        if (year === currentYear && month === currentMonth) {
          acc[categoryId].currentMonthCount++;
        }
      }
      
      return acc;
    }, {});

    // Ordenar e pegar top 10
    const sortedCategories = Object.values(categoryCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    console.log(`Processado ranking de ${sortedCategories.length} categorias`);

    return res.status(200).json({
      categories: sortedCategories,
      metadata: {
        totalCategories: Object.keys(categoryCounts).length,
        totalRequests: helpRequests.length,
        currentMonthRequests: currentMonthRequests.length
      }
    });

  } catch (error) {
    console.error('Erro ao processar ranking:', error);
    return res.status(500).json({
      error: 'Erro ao processar ranking de categorias.',
      details: error.message
    });
  }
}