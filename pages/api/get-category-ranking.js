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
 * Função para verificar se a tabela analyst_{user_code} existe
 */
const checkAnalystTableExists = async (userCode) => {
  const { error } = await supabase
    .from(`analyst_${userCode}`)
    .select('id')
    .limit(1);

  if (error && error.message.includes('relation')) {
    throw new Error(`Tabela analyst_${userCode} não encontrada.`);
  }
};

/**
 * Função para buscar registros e calcular o ranking
 */
const calculateRanking = async (userCode, dateRange) => {
  await checkAnalystTableExists(userCode);

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

    const recordDate = dayjs(record.date);
    if (!acc[category].lastUsage || recordDate.isAfter(acc[category].lastUsage)) {
      acc[category].lastUsage = record.date;
    }

    return acc;
  }, {});

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
    const analyst = await validateAnalyst(analystId);

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
      default:
        dateRange = {
          start: now.startOf('month').format('YYYY-MM-DD'),
          end: now.endOf('month').format('YYYY-MM-DD')
        };
    }

    const fullRanking = await calculateRanking(analyst.user_code, dateRange);
    const topCategories = fullRanking.slice(0, 10);

    return res.status(200).json({
      categories: topCategories,
      metadata: {
        analyst: {
          id: analyst.id,
          name: analyst.name,
          user_code: analyst.user_code
        },
        period: dateRange,
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
