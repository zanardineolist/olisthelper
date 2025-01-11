import { supabase } from '../../utils/supabaseClient';
import dayjs from 'dayjs';

/**
 * Handler para buscar registros detalhados de um analista
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido. Use GET.' });
  }

  const { analystId, startDate, endDate, viewMode } = req.query;

  // 🔎 Validação: Verifica se o ID do analista foi fornecido
  if (!analystId) {
    console.warn('[RECORDS] ID do analista não fornecido.');
    return res.status(400).json({ error: 'ID do analista não fornecido.' });
  }

  try {
    // 📅 Definir intervalo de datas (padrão: mês atual)
    const start = startDate || dayjs().startOf('month').format('YYYY-MM-DD');
    const end = endDate || dayjs().endOf('month').format('YYYY-MM-DD');

    // 🔍 Buscar registros com filtro de datas
    const { data: records, error } = await supabase
      .from(`analyst_${analystId}`)
      .select('date, time, user_name, user_email, category, description')
      .gte('date', start)
      .lte('date', end)
      .order('date', { ascending: false });

    // 📛 Tratamento de erro da consulta
    if (error) {
      console.error(`[RECORDS] Erro ao buscar registros: ${error.message}`);
      return res.status(500).json({ error: 'Erro ao buscar registros do analista.' });
    }

    // 🔎 Validação: Verificar se há registros
    if (!records || records.length === 0) {
      console.warn(`[RECORDS] Nenhum registro encontrado para o analista ID: ${analystId}`);
      return res.status(404).json({ error: 'Nenhum registro encontrado para este analista.' });
    }

    // 🎨 Formatação personalizada dos dados conforme viewMode
    let formattedData;
    if (viewMode === 'profile') {
      // Exibição compacta para o perfil
      formattedData = records.map((record) => ({
        date: dayjs(record.date).format('DD/MM/YYYY'),
        category: record.category,
        description: record.description,
      }));
    } else {
      // Exibição completa
      formattedData = records;
    }

    // ✅ Retornar os registros formatados
    return res.status(200).json({ records: formattedData });
  } catch (err) {
    console.error('[RECORDS] Erro inesperado:', err);
    return res.status(500).json({ error: 'Erro inesperado ao buscar registros do analista.' });
  }
}
