import { supabase } from '../../utils/supabaseClient';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault("America/Sao_Paulo");

/**
 * Função para validar e obter dados do analista pelo user_code
 */
const validateAnalyst = async (userCode) => {
  console.log(`[VALIDATE ANALYST] Iniciando validação para userCode: ${userCode}`);

  try {
    // Primeiro, vamos fazer um log da query para debug
    const query = supabase
      .from('users')
      .select('*');
    
    console.log('[VALIDATE ANALYST] Query básica executada');

    // Vamos verificar todos os usuários primeiro
    const { data: allUsers, error: allUsersError } = await query;
    
    if (allUsersError) {
      console.error('[VALIDATE ANALYST] Erro ao buscar todos usuários:', allUsersError);
      throw new Error('Erro ao acessar banco de dados');
    }

    console.log('[VALIDATE ANALYST] Total de usuários encontrados:', allUsers?.length);
    console.log('[VALIDATE ANALYST] user_codes disponíveis:', allUsers?.map(u => u.user_code));

    // Agora vamos buscar o usuário específico
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('user_code', userCode.toString())
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Vamos fazer uma busca mais detalhada para debug
        const { data: similarUsers, error: similarError } = await supabase
          .from('users')
          .select('*')
          .like('user_code', `%${userCode}%`);

        console.log('[VALIDATE ANALYST] Busca por user_codes similares:', {
          searched: userCode,
          found: similarUsers?.map(u => ({ code: u.user_code, name: u.name }))
        });

        console.error(`[VALIDATE ANALYST] Analista não encontrado para userCode: ${userCode}`);
        throw new Error('Analista não encontrado');
      }
      console.error(`[VALIDATE ANALYST] Erro na consulta:`, error);
      throw new Error('Erro ao validar o analista');
    }

    console.log(`[VALIDATE ANALYST] Analista encontrado:`, {
      id: data.id,
      name: data.name,
      user_code: data.user_code,
      role: data.role
    });

    if (!['analyst', 'tax'].includes(data.role)) {
      console.error(`[VALIDATE ANALYST] Role inválida:`, data.role);
      throw new Error('Usuário não é um analista ou fiscal');
    }

    return data;
  } catch (error) {
    console.error(`[VALIDATE ANALYST] Erro durante validação:`, error);
    throw error;
  }
};

/**
 * Função para verificar se a tabela analyst_{user_code} existe
 */
const checkAnalystTableExists = async (userCode) => {
  const { error } = await supabase
    .from(`analyst_${userCode}`)
    .select('id')
    .limit(1);

  if (error) {
    console.error(`[CHECK TABLE] Erro ao verificar a tabela analyst_${userCode}: ${error.message}`);
    if (error.message.includes('relation') || error.code === '42P01') {
      throw new Error(`Tabela analyst_${userCode} não encontrada.`);
    }
    throw new Error(`Erro ao verificar a tabela: ${error.message}`);
  }

  console.log(`[CHECK TABLE] Tabela analyst_${userCode} existe.`);
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

  const { userCode, period = 'month' } = req.query;

  if (!userCode) {
    console.warn('[CATEGORY RANKING] userCode do analista não fornecido.');
    return res.status(400).json({ error: 'userCode do analista não fornecido.' });
  }

  try {
    const analyst = await validateAnalyst(userCode);

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

    const fullRanking = await calculateRanking(userCode, dateRange);
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
