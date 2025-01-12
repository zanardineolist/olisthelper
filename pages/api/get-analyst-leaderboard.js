import { supabase } from '../../utils/supabaseClient';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

// Configurar dayjs para trabalhar com timezone
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault("America/Sao_Paulo");

/**
 * Função auxiliar para validar o ID do analista
 */
const validateAnalystId = async (analystId) => {
  const { data: user, error } = await supabase
    .from('users')
    .select('id, user_code')
    .eq('id', analystId)
    .single();

  if (error || !user) {
    throw new Error('Analista não encontrado');
  }

  return user.user_code;
};

/**
 * Handler para retornar o leaderboard de desempenho de um analista
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido. Use GET.' });
  }

  const { analystId } = req.query;

  if (!analystId) {
    console.warn('[LEADERBOARD] ID do analista não fornecido.');
    return res.status(400).json({ error: 'ID do analista não fornecido.' });
  }

  try {
    // Validar analista e obter user_code
    const userCode = await validateAnalystId(analystId);
    
    // Definir intervalo do mês atual
    const now = dayjs();
    const startOfMonth = now.startOf('month').format('YYYY-MM-DD');
    const endOfMonth = now.endOf('month').format('YYYY-MM-DD');

    // Buscar registros do analista
    const { data: records, error } = await supabase
      .from(`analyst_${userCode}`)
      .select(`
        category,
        date,
        user_name,
        user_email
      `)
      .gte('date', startOfMonth)
      .lte('date', endOfMonth)
      .order('date', { ascending: false });

    if (error) {
      console.error(`[LEADERBOARD] Erro ao buscar registros: ${error.message}`);
      return res.status(500).json({ error: 'Erro ao buscar registros do analista.' });
    }

    if (!records?.length) {
      console.warn(`[LEADERBOARD] Nenhum registro encontrado para o analista ID: ${analystId}`);
      return res.status(200).json({ 
        leaderboard: [],
        userStats: {
          totalRecords: 0,
          uniqueUsers: 0
        }
      });
    }

    // Agrupar por usuário
    const userCounts = records.reduce((acc, record) => {
      const userName = record.user_name;
      if (!acc[userName]) {
        acc[userName] = {
          count: 0,
          email: record.user_email
        };
      }
      acc[userName].count++;
      return acc;
    }, {});

    // Criar leaderboard
    const leaderboard = Object.entries(userCounts)
      .map(([name, data]) => ({
        name,
        email: data.email,
        count: data.count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10

    // Estatísticas adicionais
    const userStats = {
      totalRecords: records.length,
      uniqueUsers: new Set(records.map(r => r.user_email)).size
    };

    // Cache dos resultados (opcional, implementar se necessário)
    // await setCache(`leaderboard:${analystId}`, { leaderboard, userStats });

    return res.status(200).json({
      leaderboard,
      userStats,
      metadata: {
        periodStart: startOfMonth,
        periodEnd: endOfMonth,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (err) {
    console.error('[LEADERBOARD] Erro inesperado:', err);
    return res.status(500).json({ 
      error: 'Erro inesperado ao gerar o leaderboard.',
      message: err.message
    });
  }
}