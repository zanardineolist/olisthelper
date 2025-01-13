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

    // Modificar a consulta para usar .ilike para correspondência case-insensitive
    const { data: helpRequests, error } = await supabase
      .from('help_requests')
      .select('*')
      .ilike('analyst_id', analystId.trim());

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

    // Configuração da data atual no timezone BRT
    const brtDate = new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" });
    const currentDate = new Date(brtDate);
    
    // Cálculo dos meses (mantendo ambos os formatos para garantir compatibilidade)
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    const currentMonthStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

    const lastMonthDate = new Date(currentDate);
    lastMonthDate.setMonth(currentDate.getMonth() - 1);
    const lastMonth = lastMonthDate.getMonth() + 1;
    const lastMonthYear = lastMonthDate.getFullYear();
    const lastMonthStr = `${lastMonthYear}-${String(lastMonth).padStart(2, '0')}`;

    // Contagem de registros
    let currentMonthCount = 0;
    let lastMonthCount = 0;

    helpRequests.forEach(({ request_date }) => {
      if (!request_date) return;

      // Usar substring para comparar apenas ano-mês
      const requestYearMonth = request_date.substring(0, 7);
      
      if (requestYearMonth === currentMonthStr) {
        currentMonthCount++;
      } else if (requestYearMonth === lastMonthStr) {
        lastMonthCount++;
      }
    });

    console.log('Contagens calculadas:', { currentMonth: currentMonthCount, lastMonth: lastMonthCount });

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
    console.error('Erro ao obter registros:', error);
    return res.status(500).json({ 
      error: 'Erro ao obter registros do analista.',
      details: error.message,
      status: 'error'
    });
  }
}