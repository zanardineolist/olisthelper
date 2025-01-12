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
    // Consulta ao Supabase para buscar os registros de ajuda do analista
    const { data: helpRequests, error } = await supabase
      .from('help_requests')
      .select('*')
      .eq('analyst_id', analystId.trim());

    // Console.log para debug
    console.log('Buscando registros para analista:', analystId);
    console.log('Registros encontrados:', helpRequests?.length || 0);

    if (error) throw error;

    if (!helpRequests || helpRequests.length === 0) {
      return res.status(200).json({ 
        currentMonth: 0, 
        lastMonth: 0, 
        rows: [],
        status: 'success' 
      });
    }

    // Configuração da data atual no timezone BRT
    const brtDate = new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" });
    const currentDate = new Date(brtDate);
    
    // Cálculo do mês atual
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;

    // Cálculo do mês anterior considerando virada de ano
    const lastMonthDate = new Date(currentDate);
    lastMonthDate.setMonth(currentDate.getMonth() - 1);
    const lastMonth = lastMonthDate.getMonth() + 1;
    const lastMonthYear = lastMonthDate.getFullYear();

    let currentMonthCount = 0;
    let lastMonthCount = 0;

    // Processamento das requisições de ajuda
    helpRequests.forEach(({ request_date }) => {
      if (!request_date) return;

      try {
        // Parse da data no formato YYYY-MM-DD
        const [year, month, day] = request_date.split('-').map(Number);
        
        // Validação dos componentes da data
        if (!year || !month || !day) return;
        
        if (year === currentYear && month === currentMonth) {
          currentMonthCount++;
        } else if (year === lastMonthYear && month === lastMonth) {
          lastMonthCount++;
        }
      } catch (dateError) {
        console.error('Erro ao processar data:', dateError);
        // Continua o processamento mesmo se uma data específica falhar
      }
    });

    // Retorno para o modo profile
    if (mode === 'profile') {
      return res.status(200).json({
        currentMonth: currentMonthCount,
        lastMonth: lastMonthCount,
        rows: helpRequests,
        status: 'success'
      });
    }

    // Processamento para o modo filter
    const filteredRows = helpRequests.filter(({ request_date }) => {
      if (!request_date) return false;

      try {
        const [year, month, day] = request_date.split('-').map(Number);
        if (!year || !month || !day) return false;

        const date = new Date(year, month - 1, day);
        const diffTime = currentDate - date;
        const diffDays = diffTime / (1000 * 60 * 60 * 24);
        const filterDays = filter ? parseInt(filter, 10) : 30;

        return !isNaN(diffDays) && diffDays <= filterDays;
      } catch (dateError) {
        console.error('Erro ao processar data para filtro:', dateError);
        return false;
      }
    });

    // Agregação dos dados filtrados
    const dateCountMap = filteredRows.reduce((acc, { request_date }) => {
      if (request_date) {
        acc[request_date] = (acc[request_date] || 0) + 1;
      }
      return acc;
    }, {});

    // Retorno para o modo filter
    return res.status(200).json({
      count: filteredRows.length,
      dates: Object.keys(dateCountMap),
      counts: Object.values(dateCountMap),
      rows: filteredRows,
      status: 'success'
    });

  } catch (error) {
    console.error('Erro ao obter registros do analista:', error);
    return res.status(500).json({ 
      error: 'Erro ao obter registros do analista.',
      details: error.message,
      status: 'error'
    });
  }
}