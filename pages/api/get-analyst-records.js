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

    if (mode === 'profile') {
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1;
      const currentYear = currentDate.getFullYear();
      const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
      const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;

      let currentMonthCount = 0;
      let lastMonthCount = 0;

      // Contagem de registros do mês atual e mês anterior
      helpRequests.forEach(({ request_date }) => {
        const date = new Date(request_date);
        const month = date.getMonth() + 1;
        const year = date.getFullYear();

        if (year === currentYear && month === currentMonth) {
          currentMonthCount++;
        } else if (year === lastMonthYear && month === lastMonth) {
          lastMonthCount++;
        }
      });

      return res.status(200).json({
        currentMonth: currentMonthCount,
        lastMonth: lastMonthCount,
      });
    }

    // Resposta padrão com os registros
    res.status(200).json({ rows: helpRequests });
  } catch (error) {
    console.error('Erro ao obter registros do analista:', error);
    res.status(500).json({ error: 'Erro ao obter registros.' });
  }
}
