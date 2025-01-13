import { supabase } from '../../utils/supabaseClient';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

// Configurar o timezone corretamente
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault("America/Sao_Paulo");

export default async function handler(req, res) {
  const { analystId, mode, filter } = req.query;

  if (!analystId || analystId === 'undefined') {
    console.log('Erro: ID do analista não fornecido.');
    return res.status(400).json({ error: 'ID do analista é obrigatório.' });
  }

  try {
    // Verificar se o analista existe
    const { data: analyst, error: analystError } = await supabase
      .from('users')
      .select('id, name')
      .eq('id', analystId.trim())
      .single();

    if (analystError || !analyst) {
      console.log('Erro: Analista não encontrado.');
      return res.status(404).json({ error: 'Analista não encontrado.' });
    }

    console.log(`Buscando registros para o analista ${analyst.name} (${analystId})`);

    // Buscar todos os registros de ajuda do analista
    const { data: helpRequests, error: requestsError } = await supabase
      .from('help_requests')
      .select(`
        id,
        analyst_id,
        requester_name,
        requester_email,
        category_id,
        description,
        request_date,
        request_time,
        created_at,
        categories (
          id,
          name
        )
      `)
      .eq('analyst_id', analystId.trim())
      .order('request_date', { ascending: false });

    if (requestsError) {
      console.error('Erro na consulta:', requestsError);
      throw requestsError;
    }

    if (!helpRequests || helpRequests.length === 0) {
      console.log('Nenhum registro encontrado para o analista.');
      return res.status(200).json({ 
        count: 0, 
        rows: [],
        metadata: {
          analyst: analyst.name,
          totalRequests: 0
        }
      });
    }

    console.log(`Total de registros encontrados: ${helpRequests.length}`);

    // Mode "profile": contagem de mês atual e anterior
    if (mode === 'profile') {
      const now = dayjs().tz("America/Sao_Paulo");
      const currentMonth = now.month() + 1;
      const currentYear = now.year();
      const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
      const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;

      let currentMonthCount = 0;
      let lastMonthCount = 0;

      helpRequests.forEach(request => {
        if (!request.request_date) return;
        
        const [year, month] = request.request_date.split('-').map(num => parseInt(num, 10));
        
        if (year === currentYear && month === currentMonth) {
          currentMonthCount++;
        } else if (year === lastMonthYear && month === lastMonth) {
          lastMonthCount++;
        }
      });

      const formattedRows = helpRequests.map(request => ({
        ...request,
        category_name: request.categories?.name || 'Categoria não encontrada',
        full_date: request.request_date 
          ? dayjs(request.request_date).tz("America/Sao_Paulo").format('DD/MM/YYYY')
          : 'Data não disponível'
      }));

      return res.status(200).json({
        currentMonth: currentMonthCount,
        lastMonth: lastMonthCount,
        rows: formattedRows,
        metadata: {
          analyst: analyst.name,
          totalRequests: helpRequests.length
        }
      });
    }

    // Lógica padrão com filtro de dias
    const currentDate = dayjs().tz("America/Sao_Paulo");
    const filterDays = filter ? parseInt(filter, 10) : 30;

    // Filtrar registros pelo período especificado
    const filteredRows = helpRequests.filter(request => {
      if (!request.request_date) return false;
      
      const [year, month, day] = request.request_date.split('-').map(num => parseInt(num, 10));
      const requestDate = dayjs(new Date(year, month - 1, day)).tz("America/Sao_Paulo");
      return currentDate.diff(requestDate, 'day') <= filterDays;
    });

    if (filteredRows.length === 0) {
      console.log('Nenhum registro encontrado para o período filtrado.');
      return res.status(200).json({ 
        count: 0, 
        dates: [], 
        counts: [], 
        rows: [],
        metadata: {
          analyst: analyst.name,
          totalRequests: helpRequests.length,
          filteredRequests: 0,
          period: `Últimos ${filterDays} dias`
        }
      });
    }

    // Agrupar contagens por data
    const datesCount = filteredRows.reduce((acc, request) => {
      if (!request.request_date) return acc;
      
      const formattedDate = request.request_date.split('T')[0];
      acc[formattedDate] = (acc[formattedDate] || 0) + 1;
      return acc;
    }, {});

    // Preparar rows com informações formatadas
    const formattedRows = filteredRows.map(request => ({
      ...request,
      category_name: request.categories?.name || 'Categoria não encontrada',
      full_date: request.request_date 
        ? dayjs(request.request_date).tz("America/Sao_Paulo").format('DD/MM/YYYY')
        : 'Data não disponível'
    }));

    return res.status(200).json({
      count: filteredRows.length,
      dates: Object.keys(datesCount),
      counts: Object.values(datesCount),
      rows: formattedRows,
      metadata: {
        analyst: analyst.name,
        totalRequests: helpRequests.length,
        filteredRequests: filteredRows.length,
        period: `Últimos ${filterDays} dias`
      }
    });

  } catch (error) {
    console.error('Erro ao processar registros:', error);
    return res.status(500).json({ 
      error: 'Erro ao processar registros do analista.', 
      details: error.message 
    });
  }
}