import { supabase } from '../../utils/supabaseClient';
import dayjs from 'dayjs';

/**
 * Handler para consolidar dados do dashboard do supervisor
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
    const startOfMonth = dayjs().startOf('month').format('YYYY-MM-DD');
    const endOfMonth = dayjs().endOf('month').format('YYYY-MM-DD');

    // Buscar registros de desempenho (ajudas prestadas)
    const { data: helpRecords, error: helpError } = await supabase
      .from(`analyst_${userId}`)
      .select('category, date')
      .gte('date', startOfMonth)
      .lte('date', endOfMonth);

    if (helpError) {
      console.error(`[SUPER DASHBOARD] Erro ao buscar registros de desempenho: ${helpError.message}`);
      return res.status(500).json({ error: 'Erro ao buscar registros de desempenho.' });
    }

    // Buscar solicitações de ajuda
    const { data: helpRequests, error: requestError } = await supabase
      .from('help_records')
      .select('id')
      .eq('analyst_id', userId)
      .gte('date', startOfMonth)
      .lte('date', endOfMonth);

    if (requestError) {
      console.error(`[SUPER DASHBOARD] Erro ao buscar solicitações de ajuda: ${requestError.message}`);
      return res.status(500).json({ error: 'Erro ao buscar solicitações de ajuda.' });
    }

    // Calcular o ranking de categorias
    const categoryCount = {};
    helpRecords.forEach((record) => {
      const category = record.category || 'Sem Categoria';
      categoryCount[category] = (categoryCount[category] || 0) + 1;
    });

    const categoryRanking = Object.entries(categoryCount)
      .sort((a, b) => b[1] - a[1])
      .map(([category, count]) => ({ category, count }));

    return res.status(200).json({
      totalHelpProvided: helpRecords.length,
      totalHelpRequests: helpRequests.length,
      categoryRanking,
    });
  } catch (err) {
    console.error('[SUPER DASHBOARD] Erro inesperado:', err);
    return res.status(500).json({ error: 'Erro inesperado ao buscar dados do dashboard.' });
  }
}
