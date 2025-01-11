import { supabase } from '../../utils/supabaseClient';
import dayjs from 'dayjs';

/**
 * Handler para retornar a quantidade de solicitações de ajuda feitas por um usuário
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
    const startOfCurrentMonth = dayjs().startOf('month').format('YYYY-MM-DD');
    const endOfCurrentMonth = dayjs().endOf('month').format('YYYY-MM-DD');

    const startOfLastMonth = dayjs().subtract(1, 'month').startOf('month').format('YYYY-MM-DD');
    const endOfLastMonth = dayjs().subtract(1, 'month').endOf('month').format('YYYY-MM-DD');

    // Consulta de solicitações de ajuda do mês atual
    const { data: currentMonthData, error: currentMonthError } = await supabase
      .from('help_records')
      .select('id')
      .eq('user_id', userId)
      .gte('date', startOfCurrentMonth)
      .lte('date', endOfCurrentMonth);

    if (currentMonthError) {
      console.error(`[USER HELP REQUESTS] Erro ao buscar dados do mês atual: ${currentMonthError.message}`);
      return res.status(500).json({ error: 'Erro ao buscar dados do mês atual.' });
    }

    // Consulta de solicitações de ajuda do mês anterior
    const { data: lastMonthData, error: lastMonthError } = await supabase
      .from('help_records')
      .select('id')
      .eq('user_id', userId)
      .gte('date', startOfLastMonth)
      .lte('date', endOfLastMonth);

    if (lastMonthError) {
      console.error(`[USER HELP REQUESTS] Erro ao buscar dados do mês anterior: ${lastMonthError.message}`);
      return res.status(500).json({ error: 'Erro ao buscar dados do mês anterior.' });
    }

    return res.status(200).json({
      currentMonthRequests: currentMonthData.length,
      lastMonthRequests: lastMonthData.length,
    });
  } catch (err) {
    console.error('[USER HELP REQUESTS] Erro inesperado:', err);
    return res.status(500).json({ error: 'Erro inesperado ao buscar solicitações de ajuda.' });
  }
}
