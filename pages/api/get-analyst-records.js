import { supabase } from '../../utils/supabaseClient';

export default async function handler(req, res) {
  const { analystId, mode, filter } = req.query;

  if (!analystId) {
    return res.status(400).json({ 
      error: 'ID do analista é obrigatório e deve ser válido.',
      status: 'error' 
    });
  }

  try {
    console.log('Iniciando busca para analista:', analystId);

    // Usar eq para UUID
    const { data: helpRequests, error } = await supabase
      .from('help_requests')
      .select('*')
      .eq('analyst_id', analystId.trim())
      .order('request_date', { ascending: false }); // Ordenar por data

    console.log('Query executada:', error ? 'com erro' : 'com sucesso');
    console.log('Total de registros encontrados:', helpRequests?.length || 0);

    if (error) {
      console.error('Erro na consulta:', error);
      throw error;
    }

    if (!helpRequests || helpRequests.length === 0) {
      console.log('Nenhum registro encontrado');
      return res.status(200).json({ 
        currentMonth: 0, 
        lastMonth: 0, 
        rows: [],
        status: 'success' 
      });
    }

    // Data atual em BRT
    const brtDate = new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" });
    const currentDate = new Date(brtDate);
    
    // Mês atual e anterior
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    
    const lastMonthDate = new Date(currentDate);
    lastMonthDate.setMonth(currentDate.getMonth() - 1);
    const lastMonth = lastMonthDate.getMonth() + 1;
    const lastMonthYear = lastMonthDate.getFullYear();

    let currentMonthCount = 0;
    let lastMonthCount = 0;

    helpRequests.forEach(({ request_date }) => {
      if (!request_date) return;

      try {
        const [year, month] = request_date.split('-').map(Number);
        
        if (year === currentYear && month === currentMonth) {
          currentMonthCount++;
        } else if (year === lastMonthYear && month === lastMonth) {
          lastMonthCount++;
        }
      } catch (dateError) {
        console.error('Erro ao processar data:', dateError);
      }
    });

    console.log('Contagens calculadas:', { 
      currentMonth: currentMonthCount, 
      lastMonth: lastMonthCount,
      currentYearMonth: `${currentYear}-${currentMonth}`,
      lastYearMonth: `${lastMonthYear}-${lastMonth}`
    });

    if (mode === 'profile') {
      return res.status(200).json({
        currentMonth: currentMonthCount,
        lastMonth: lastMonthCount,
        rows: helpRequests,
        status: 'success'
      });
    }

    // Processamento para modo filter
    const filteredRows = helpRequests.filter(({ request_date }) => {
      if (!request_date) return false;

      try {
        const requestDate = new Date(request_date);
        const diffTime = currentDate - requestDate;
        const diffDays = diffTime / (1000 * 60 * 60 * 24);
        const filterDays = filter ? parseInt(filter, 10) : 30;

        return !isNaN(diffDays) && diffDays <= filterDays;
      } catch (dateError) {
        console.error('Erro ao processar data para filtro:', dateError);
        return false;
      }
    });

    return res.status(200).json({
      count: filteredRows.length,
      dates: [...new Set(filteredRows.map(row => row.request_date))].sort(),
      rows: filteredRows,
      status: 'success'
    });

  } catch (error) {
    console.error('Erro ao obter registros:', error);
    return res.status(500).json({ 
      error: 'Erro ao obter registros do analista.',
      details: error.message,
      status: 'error'
    });
  }
}