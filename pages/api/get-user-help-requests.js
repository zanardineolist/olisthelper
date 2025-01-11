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
 * Função para buscar solicitações de ajuda por período
 */
const getHelpRequestsForPeriod = async (userId, period) => {
  const { data, error } = await supabase
    .from('help_records')
    .select(`
      id,
      analyst_id,
      category_id,
      description,
      date,
      time,
      analysts:users!help_records_analyst_id_fkey (
        name,
        email,
        role
      ),
      categories (
        name
      )
    `)
    .eq('user_id', userId)
    .gte('date', period.start)
    .lte('date', period.end)
    .order('date', { ascending: false });

  if (error) {
    throw new Error(`Erro ao buscar solicitações de ajuda: ${error.message}`);
  }

  return data || [];
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
    console.warn('[USER HELP REQUESTS] ID do usuário não fornecido.');
    return res.status(400).json({ error: 'ID do usuário não fornecido.' });
  }

  try {
    // Validar usuário
    const user = await validateUser(userId);

    // Definir períodos
    const now = dayjs();
    const currentPeriod = {
      start: now.startOf('month').format('YYYY-MM-DD'),
      end: now.endOf('month').format('YYYY-MM-DD')
    };

    const lastPeriod = {
      start: now.subtract(1, 'month').startOf('month').format('YYYY-MM-DD'),
      end: now.subtract(1, 'month').endOf('month').format('YYYY-MM-DD')
    };

    // Buscar dados em paralelo
    const [currentMonthRequests, lastMonthRequests] = await Promise.all([
      getHelpRequestsForPeriod(userId, currentPeriod),
      getHelpRequestsForPeriod(userId, lastPeriod)
    ]);

    // Calcular métricas adicionais
    const currentMonthAnalysts = new Set(currentMonthRequests.map(r => r.analyst_id));
    const currentMonthCategories = new Set(currentMonthRequests.map(r => r.category_id));

    const metrics = {
      currentMonth: {
        total: currentMonthRequests.length,
        uniqueAnalysts: currentMonthAnalysts.size,
        uniqueCategories: currentMonthCategories.size,
        averagePerDay: +(currentMonthRequests.length / now.daysInMonth()).toFixed(2)
      },
      lastMonth: {
        total: lastMonthRequests.length
      },
      trend: {
        difference: currentMonthRequests.length - lastMonthRequests.length,
        percentage: lastMonthRequests.length 
          ? +((currentMonthRequests.length - lastMonthRequests.length) / lastMonthRequests.length * 100).toFixed(2)
          : null
      }
    };

    return res.status(200).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      metrics,
      currentMonthRequests: currentMonthRequests.map(request => ({
        id: request.id,
        date: request.date,
        time: request.time,
        category: request.categories?.name,
        description: request.description,
        analyst: {
          name: request.analysts?.name,
          email: request.analysts?.email,
          role: request.analysts?.role
        }
      })),
      metadata: {
        periods: {
          current: currentPeriod,
          last: lastPeriod
        },
        generatedAt: new Date().toISOString()
      }
    });

  } catch (err) {
    console.error('[USER HELP REQUESTS] Erro inesperado:', err);
    return res.status(500).json({
      error: 'Erro inesperado ao buscar solicitações de ajuda.',
      message: err.message
    });
  }
}