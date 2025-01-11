import { supabase } from '../../utils/supabaseClient';
import dayjs from 'dayjs';

/**
 * Handler para retornar o ranking de categorias utilizadas por um usuário
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido. Use GET.' });
  }

  const { userId } = req.query;

  if (!userId) {
    console.warn('[USER CATEGORY RANKING] ID do usuário não fornecido.');
    return res.status(400).json({ error: 'ID do usuário não fornecido.' });
  }

  try {
    const startOfMonth = dayjs().startOf('month').format('YYYY-MM-DD');
    const endOfMonth = dayjs().endOf('month').format('YYYY-MM-DD');

    // Buscar registros de ajuda do usuário no mês atual
    const { data: helpRecords, error } = await supabase
      .from('help_records')
      .select('category_id, date')
      .eq('user_id', userId)
      .gte('date', startOfMonth)
      .lte('date', endOfMonth);

    if (error) {
      console.error(`[USER CATEGORY RANKING] Erro ao buscar registros: ${error.message}`);
      return res.status(500).json({ error: 'Erro ao buscar registros do usuário.' });
    }

    if (!helpRecords || helpRecords.length === 0) {
      console.warn(`[USER CATEGORY RANKING] Nenhum registro encontrado para o usuário ID: ${userId}`);
      return res.status(404).json({ error: 'Nenhum registro encontrado para este usuário.' });
    }

    // Contagem de categorias
    const categoryCount = {};
    helpRecords.forEach((record) => {
      const category = record.category_id || 'Sem Categoria';
      categoryCount[category] = (categoryCount[category] || 0) + 1;
    });

    // Ordenação do ranking
    const ranking = Object.entries(categoryCount)
      .sort((a, b) => b[1] - a[1])
      .map(([category, count]) => ({ category, count }));

    return res.status(200).json({ ranking });
  } catch (err) {
    console.error('[USER CATEGORY RANKING] Erro inesperado:', err);
    return res.status(500).json({ error: 'Erro inesperado ao gerar ranking de categorias.' });
  }
}
