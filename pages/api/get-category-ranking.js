import { supabase } from '../../utils/supabaseClient';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

// Configurar o timezone corretamente
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault("America/Sao_Paulo");

export default async function handler(req, res) {
  const { analystId } = req.query;

  if (!analystId || analystId.trim() === '') {
    console.log('Erro: ID do analista não fornecido ou inválido.');
    return res.status(400).json({ error: 'ID do analista é obrigatório e deve ser válido.' });
  }

  try {
    console.log(`Buscando ranking de categorias no Supabase para o analista: ${analystId}`);

    // Definir o período do mês atual
    const startOfMonth = dayjs().startOf('month').format('YYYY-MM-DD');
    const endOfMonth = dayjs().endOf('month').format('YYYY-MM-DD');

    // Buscar registros de ajuda relacionados ao analista no mês atual
    const { data: helpRequests, error } = await supabase
      .from('help_requests')
      .select(`
        category_id,
        categories (
          id,
          name
        )
      `)
      .eq('analyst_id', analystId.trim())
      .gte('request_date', startOfMonth)
      .lte('request_date', endOfMonth);

    if (error) {
      console.error('Erro na consulta ao Supabase:', error);
      throw error;
    }

    if (!helpRequests || helpRequests.length === 0) {
      console.log('Nenhum registro encontrado.');
      return res.status(200).json({ 
        categories: [],
        metadata: {
          totalCategories: 0,
          totalRequests: 0
        }
      });
    }

    console.log(`Total de registros encontrados: ${helpRequests.length}`);

    // Contar ocorrências por categoria
    const categoryCounts = helpRequests.reduce((acc, { category_id, categories }) => {
      if (!category_id) return acc;
      
      const categoryName = categories?.name || 'Categoria não encontrada';
      
      if (!acc[category_id]) {
        acc[category_id] = {
          id: category_id,
          name: categoryName,
          count: 0
        };
      }
      
      acc[category_id].count++;
      return acc;
    }, {});

    // Ordenar e pegar as top 10 categorias
    const sortedCategories = Object.values(categoryCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    console.log('Ranking de categorias processado:', sortedCategories);

    return res.status(200).json({
      categories: sortedCategories,
      metadata: {
        totalCategories: Object.keys(categoryCounts).length,
        totalRequests: helpRequests.length
      }
    });

  } catch (error) {
    console.error('Erro ao obter ranking de categorias:', error);
    return res.status(500).json({ 
      error: 'Erro ao obter ranking de categorias.', 
      details: error.message 
    });
  }
}