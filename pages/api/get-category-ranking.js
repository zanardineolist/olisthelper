import { supabase } from '../../utils/supabaseClient';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

// Configurar dayjs para trabalhar com timezone
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault("America/Sao_Paulo");

/**
 * Função para validar e obter dados do analista
 */
const validateAnalyst = async (analystId) => {
  const { data: analyst, error } = await supabase
    .from('users')
    .select('id, user_code, name, role')
    .eq('id', analystId)
    .single();

  if (error || !analyst) {
    throw new Error('Analista não encontrado');
  }

  if (!['analyst', 'tax'].includes(analyst.role)) {
    throw new Error('Usuário não é um analista ou fiscal');
  }

  return analyst;
};

/**
 * Função para buscar registros e calcular o ranking
 */
const calculateRanking = async (userCode, dateRange) => {
  const { data: records, error } = await supabase
    .from(`analyst_${userCode}`)
    .select(`
      category,
      date,
      user_name,
      user_email
    `)
    .gte('date', dateRange.start)
    .lte('date', dateRange.end)
    .order('date', { ascending: false });

  if (error) {
    throw new Error(`Erro ao buscar registros: ${error.message}`);
  }

  // Contagem por categoria
  const categoryCount = records.reduce((acc, record) => {
    const category = record.category || 'Sem Categoria';
    if (!acc[category]) {
      acc[category] = {
        count: 0,
        users: new Set(),
        lastUsage: null
      };
    }
    acc[category].count++;
    acc[category].users.add(record.user_email);
    
    // Atualizar data do último uso se necessário
    const recordDate = dayjs(record.date);
    if (!acc[category].lastUsage || recordDate.isAfter(acc[category].lastUsage)) {
      acc[category].lastUsage = record.date;
    }
    
    return acc;
  }, {});

  // Converter para array e ordenar
  return Object.entries(categoryCount)
    .map(([name, data]) => ({
      name,
      count: data.count,
      uniqueUsers: data.users.size,
      lastUsage: data.lastUsage,
      averagePerUser: +(data.count / data.users.size).toFixed(2)
    }))
    .sort((a, b) => b.count - a.count);
};

/**
 * Handler principal
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido. Use GET.' });
  }

  const { analystId, period = 'month' } = req.query;

  if (!analystId) {
    console.warn('[CATEGORY RANKING] ID do analista não fornecido.');
    return res.status(400).json({ error: 'ID do analista não fornecido.' });
  }

  try {
    // Validar analista
    const analyst = await validateAnalyst(analystId);

    // Definir intervalo de datas
    const now = dayjs();
    let dateRange;

    switch (period) {
      case 'week':
        dateRange = {
          start: now.startOf('week').format('YYYY-MM-DD'),
          end: now.endOf('week').format('YYYY-MM-DD')
        };
        break;
      case 'year':
        dateRange = {
          start: now.startOf('year').format('YYYY-MM-DD'),
          end: now.endOf('year').format('YYYY-MM-DD')
        };
        break;
      default: // month
        dateRange = {
          start: now.startOf('month').format('YYYY-MM-DD'),
          end: now.endOf('month').format('YYYY-MM-DD')
        };
    }

    // Calcular ranking
    const fullRanking = await calculateRanking(analyst.user_code, dateRange);

    // Separar top 10 e estatísticas gerais
    const topCategories = fullRanking.slice(0, 10);
    const totalRecords = fullRanking.reduce((sum, cat) => sum + cat.count, 0);
    const totalCategories = fullRanking.length;

    // Calcular métricas adicionais
    const statistics = {
      totalRecords,
      totalCategories,
      averagePerCategory: +(totalRecords / totalCategories).toFixed(2),
      topCategoryPercentage: topCategories[0] 
        ? +((topCategories[0].count / totalRecords) * 100).toFixed(2)
        : 0
    };

    return res.status(200).json({
      categories: topCategories,
      statistics,
      metadata: {
        analyst: {
          id: analyst.id,
          name: analyst.name,
          user_code: analyst.user_code
        },
        period: {
          type: period,
          start: dateRange.start,
          end: dateRange.end
        },
        generatedAt: new Date().toISOString()
      }
    });

  } catch (err) {
    console.error('[CATEGORY RANKING] Erro inesperado:', err);
    return res.status(500).json({
      error: 'Erro inesperado ao gerar ranking de categorias.',
      message: err.message
    });
  }
}