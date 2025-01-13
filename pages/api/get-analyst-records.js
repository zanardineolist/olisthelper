import { supabase } from '../../utils/supabaseClient';

// Função para validar se o analystId é um UUID válido
const isValidUUID = (id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id);

export default async function handler(req, res) {
  const { analystId, mode, filter } = req.query;

  if (!analystId || !isValidUUID(analystId.trim())) {
    return res.status(400).json({ 
      error: 'ID do analista é inválido ou não informado.',
      status: 'error' 
    });
  }

  try {
    console.log('Iniciando busca para analista:', analystId);

    // Buscar registros de ajuda no Supabase
    const { data: helpRequests, error } = await supabase
      .from('help_requests')
      .select('*')
      .eq('analyst_id', analystId.trim())
      .order('request_date', { ascending: false });

    console.log('Total de registros encontrados:', helpRequests?.length || 0);

    if (error) {
      console.error('Erro na consulta:', error);
      throw error;
    }

    if (!helpRequests || helpRequests.length === 0) {
      console.log('⚠️ Nenhum registro encontrado');
      return res.status(200).json({ 
        currentMonth: 0, 
        lastMonth: 0, 
        rows: [],
        status: 'success' 
      });
    }

    // Obter a data atual no timezone America/Sao_Paulo
    const brtDate = new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" });
    const currentDate = new Date(brtDate);
    
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;

    const lastMonthDate = new Date(currentDate);
    lastMonthDate.setMonth(currentDate.getMonth() - 1);
    const lastMonth = lastMonthDate.getMonth() + 1;
    const lastMonthYear = lastMonthDate.getFullYear();

    let currentMonthCount = 0;
    let lastMonthCount = 0;

    // Correção da interpretação da data no formato YYYY-MM-DD
    helpRequests.forEach(({ request_date }) => {
      if (!request_date) return;

      try {
        const [year, month, day] = request_date.split('-').map(Number);
        const date = new Date(year, month - 1, day);

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
      lastMonth: lastMonthCount
    });

    if (mode === 'profile') {
      return res.status(200).json({
        currentMonth: currentMonthCount,
        lastMonth: lastMonthCount,
        rows: helpRequests,
        status: 'success'
      });
    }

    // Filtro de registros pelo parâmetro 'filter'
    const filteredRows = helpRequests.filter(({ request_date }) => {
      if (!request_date) return false;

      try {
        const [year, month, day] = request_date.split('-').map(Number);
        const requestDate = new Date(year, month - 1, day);
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
