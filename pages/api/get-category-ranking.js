import { supabase } from '../../utils/supabaseClient';
import dayjs from 'dayjs';

/**
 * Handler para gerar o ranking de categorias mais utilizadas por um analista
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido. Use GET.' });
  }

  const { analystId } = req.query;

  if (!analystId) {
    console.warn('[CATEGORY RANKING] ID do analista não fornecido.');
    return res.status(400).json({ error: 'ID do analista não fornecido.' });
  }

  try {
    const startOfMonth = dayjs().startOf('month').format('YYYY-MM-DD');
    const endOfMonth = dayjs().endOf('month').format('YYYY-MM-DD');

    // Consulta os registros do analista no mês atual
    const { data: records, error } = await supabase
      .from(`analyst_${analystId}`)
      .select('category')
      .gte('date', startOfMonth)
      .lte('date', endOfMonth);

    if (error) {
      console.error(`[CATEGORY RANKING] Erro ao buscar registros: ${error.message}`);
      return res.status(500).json({ error: 'Erro ao buscar registros do analista.' });
    }

    if (!records || records.length === 0) {
      console.warn(`[CATEGORY RANKING] Nenhum registro encontrado para o analista ID: ${analystId}`);
      return res.status(404).json({ error: 'Nenhum registro encontrado para este analista.' });
    }

    // Contagem de categorias
    const categoryCount = {};
    records.forEach((record) => {
      const category = record.category || 'Sem Categoria';
      categoryCount[category] = (categoryCount[category] || 0) + 1;
    });

    // Ordenação das categorias por frequência
    const ranking = Object.entries(categoryCount)
      .sort((a, b) => b[1] - a[1])
      .map(([category, count]) => ({ category, count }));

    return res.status(200).json({ ranking });
  } catch (err) {
    console.error('[CATEGORY RANKING] Erro inesperado:', err);
    return res.status(500).json({ error: 'Erro inesperado ao gerar ranking de categorias.' });
  }
}
