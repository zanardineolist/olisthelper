import { supabase } from '../../utils/supabaseClient';
import dayjs from 'dayjs';

/**
 * Handler para retornar o leaderboard de desempenho de um analista
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido. Use GET.' });
  }

  const { analystId } = req.query;

  // 🔎 Validação: Verificar se o ID do analista foi fornecido
  if (!analystId) {
    console.warn('[LEADERBOARD] ID do analista não fornecido.');
    return res.status(400).json({ error: 'ID do analista não fornecido.' });
  }

  try {
    // 📅 Definir o intervalo do mês atual
    const startOfMonth = dayjs().startOf('month').format('YYYY-MM-DD');
    const endOfMonth = dayjs().endOf('month').format('YYYY-MM-DD');

    // 🔍 Buscar registros do analista no mês atual
    const { data: records, error } = await supabase
      .from(`analyst_${analystId}`)
      .select('category, date')
      .gte('date', startOfMonth)
      .lte('date', endOfMonth);

    // 📛 Tratamento de erro da consulta
    if (error) {
      console.error(`[LEADERBOARD] Erro ao buscar registros: ${error.message}`);
      return res.status(500).json({ error: 'Erro ao buscar registros do analista.' });
    }

    // 🔎 Validação: Verificar se há registros
    if (!records || records.length === 0) {
      console.warn(`[LEADERBOARD] Nenhum registro encontrado para o analista ID: ${analystId}`);
      return res.status(404).json({ error: 'Nenhum registro encontrado para este analista.' });
    }

    // 📊 Agrupar e contar categorias
    const categoryCount = {};
    records.forEach((record) => {
      const category = record.category || 'Sem Categoria';
      categoryCount[category] = (categoryCount[category] || 0) + 1;
    });

    // 🔢 Ordenar categorias por frequência
    const leaderboard = Object.entries(categoryCount)
      .sort((a, b) => b[1] - a[1])
      .map(([category, count]) => ({ category, count }));

    // ✅ Retornar o ranking de categorias
    return res.status(200).json({ leaderboard });
  } catch (err) {
    console.error('[LEADERBOARD] Erro inesperado:', err);
    return res.status(500).json({ error: 'Erro inesperado ao gerar o leaderboard.' });
  }
}
