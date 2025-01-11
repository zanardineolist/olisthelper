import { supabase } from '../../utils/supabaseClient';
import dayjs from 'dayjs';

/**
 * Handler para buscar registros de acessos remotos
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido. Use GET.' });
  }

  const { currentMonth } = req.query;

  try {
    let query = supabase
      .from('remote_access')
      .select('id, user_id, chamado, tema, description, date, time, created_at')
      .order('date', { ascending: false });

    // Se currentMonth for verdadeiro, filtra pelo mês atual
    if (currentMonth === 'true') {
      const startOfMonth = dayjs().startOf('month').format('YYYY-MM-DD');
      const endOfMonth = dayjs().endOf('month').format('YYYY-MM-DD');
      query = query.gte('date', startOfMonth).lte('date', endOfMonth);
    }

    const { data, error } = await query;

    if (error) {
      console.error(`[REMOTE RECORDS] Erro ao buscar registros remotos: ${error.message}`);
      return res.status(500).json({ error: 'Erro ao buscar registros remotos.' });
    }

    if (!data || data.length === 0) {
      console.warn('[REMOTE RECORDS] Nenhum registro remoto encontrado.');
      return res.status(404).json({ error: 'Nenhum registro remoto encontrado.' });
    }

    return res.status(200).json({ records: data });
  } catch (err) {
    console.error('[REMOTE RECORDS] Erro inesperado:', err);
    return res.status(500).json({ error: 'Erro inesperado ao buscar registros remotos.' });
  }
}
