import { supabase } from '../../utils/supabaseClient';

export default async function handler(req, res) {
  const { analystId, mode, filter } = req.query;

  if (!analystId) {
    return res.status(400).json({ error: 'ID do analista é obrigatório e deve ser válido.' });
  }

  try {
    // Consulta ao Supabase para buscar os registros de ajuda do analista
    const { data: helpRequests, error } = await supabase
      .from('help_requests')
      .select('*')
      .eq('analyst_id', analystId);

    if (error) throw error;

    if (!helpRequests || helpRequests.length === 0) {
      return res.status(200).json({ currentMonth: 0, lastMonth: 0, rows: [] });
    }

    const brtDate = new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" });
    const currentDate = new Date(brtDate);

    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();
    const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;

    let currentMonthCount = 0;
    let lastMonthCount = 0;

    // Correção da interpretação da data (YYYY-MM-DD)
    helpRequests.forEach(({ request_date }) => {
      if (!request_date) return;

      const [year, month, day] = request_date.split('-').map(Number);
      const date = new Date(year, month - 1, day);

      if (year === currentYear && month === currentMonth) {
        currentMonthCount++;
      } else if (year === lastMonthYear && month === lastMonth) {
        lastMonthCount++;
      }
    });

    // Caso seja solicitado o modo 'profile'
    if (mode === 'profile') {
      return res.status(200).json({
        currentMonth: currentMonthCount,
        lastMonth: lastMonthCount,
        rows: helpRequests
      });
    }

    // Filtro de registros baseado no parâmetro 'filter'
    const filteredRows = helpRequests.filter(({ request_date }) => {
      if (!request_date) return false;

      const [year, month, day] = request_date.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      const diffTime = currentDate - date;
      const diffDays = diffTime / (1000 * 60 * 60 * 24);

      return diffDays <= (filter ? parseInt(filter, 10) : 30);
    });

    const count = filteredRows.length;
    const dates = filteredRows.map(({ request_date }) => request_date);
    const countsObj = dates.reduce((acc, date) => {
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});

    res.status(200).json({
      count,
      dates: Object.keys(countsObj),
      counts: Object.values(countsObj),
      rows: filteredRows,
    });

  } catch (error) {
    console.error('Erro ao obter registros do analista:', error);
    res.status(500).json({ error: 'Erro ao obter registros.' });
  }
}
