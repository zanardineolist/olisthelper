import { supabase } from '../../utils/supabaseClient';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

// Configurar dayjs para trabalhar com timezone
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault("America/Sao_Paulo");

/**
 * Função para validar e obter dados do usuário
 */
const validateUser = async (userId) => {
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !user) {
    throw new Error('Usuário não encontrado');
  }

  return user;
};

/**
 * Função para buscar ajudas prestadas
 */
const getHelpProvided = async (userCode, dateRange) => {
  const { data, error } = await supabase
    .from(`analyst_${userCode}`)
    .select('*')
    .gte('date', dateRange.start)
    .lte('date', dateRange.end);

  if (error) {
    throw new Error(`Erro ao buscar ajudas prestadas: ${error.message}`);
  }

  return data || [];
};

/**
 * Função para buscar solicitações de ajuda
 */
const getHelpRequests = async (userId, dateRange) => {
  const { data, error } = await supabase
    .from('help_records')
    .select(`
      id,
      category_id,
      date,
      time,
      description,
      categories (
        name
      )
    `)
    .eq('analyst_id', userId)
    .gte('date', dateRange.start)
    .lte('date', dateRange.end);

  if (error) {
    throw new Error(`Erro ao buscar solicitações de ajuda: ${error.message}`);
  }

  return data || [];
};

/**
 * Função para calcular métricas de performance
 */
const calculatePerformanceMetrics = (helpProvided, helpRequests) => {
  // Agrupar por dia
  const dailyStats = helpProvided.reduce((acc, record) => {
    const date = record.date;
    if (!acc[date]) {
      acc[date] = { provided: 0, requests: 0 };
    }
    acc[date].provided++;
    return acc;
  }, {});

  helpRequests.forEach(record => {
    const date = record.date;
    if (!dailyStats[date]) {
      dailyStats[date] = { provided: 0, requests: 0 };
    }
    dailyStats[date].requests++;
  });

  const days = Object.keys(dailyStats).length;

  return {
    totalProvided: helpProvided.length,
    totalRequests: helpRequests.length,
    averagePerDay: days ? +(helpProvided.length / days).toFixed(2) : 0,
    requestsPerDay: days ? +(helpRequests.length / days).toFixed(2) : 0,
    dailyStats
  };
};

/**
 * Handler principal
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido. Use GET.' });
  }

  const { userId } = req.query;

  if (!userId) {
    console.warn('[SUPER DASHBOARD] ID do usuário não fornecido.');
    return res.status(400).json({ error: 'ID do usuário não fornecido.' });
  }

  try {
    // Validar usuário
    const user = await validateUser(userId);

    // Definir períodos de análise
    const now = dayjs();
    const dateRange = {
      start: now.startOf('month').format('YYYY-MM-DD'),
      end: now.endOf('month').format('YYYY-MM-DD')
    };

    // Buscar dados em paralelo
    const [helpProvided, helpRequests] = await Promise.all([
      getHelpProvided(user.user_code, dateRange),
      getHelpRequests(userId, dateRange)
    ]);

    // Calcular métricas de performance
    const performanceMetrics = calculatePerformanceMetrics(helpProvided, helpRequests);

    // Calcular ranking de categorias
    const categoryCount = helpProvided.reduce((acc, record) => {
      const category = record.category || 'Sem Categoria';
      if (!acc[category]) {
        acc[category] = { count: 0, users: new Set() };
      }
      acc[category].count++;
      acc[category].users.add(record.user_email);
      return acc;
    }, {});

    const categoryRanking = Object.entries(categoryCount)
      .map(([category, data]) => ({
        category,
        count: data.count,
        uniqueUsers: data.users.size,
        averagePerUser: +(data.count / data.users.size).toFixed(2)
      }))
      .sort((a, b) => b.count - a.count);

    return res.status(200).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        user_code: user.user_code
      },
      performance: performanceMetrics,
      categoryRanking,
      metadata: {
        period: {
          start: dateRange.start,
          end: dateRange.end
        },
        generatedAt: new Date().toISOString()
      }
    });

  } catch (err) {
    console.error('[SUPER DASHBOARD] Erro inesperado:', err);
    return res.status(500).json({
      error: 'Erro inesperado ao buscar dados do dashboard.',
      message: err.message
    });
  }
}