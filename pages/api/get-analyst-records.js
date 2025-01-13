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
    // Buscar analista por ID ou email
    const { data: analyst, error: analystError } = await supabase
      .from('users')
      .select('id, name, email')
      .or(`id.eq.${analystId},email.eq.${req.query.email}`)
      .single();

    if (analystError) {
      console.error('Erro ao buscar analista:', analystError);
      throw analystError;
    }

    if (!analyst) {
      console.log(`Analista não encontrado. ID: ${analystId}, Email: ${req.query.email}`);
      return res.status(404).json({ error: 'Analista não encontrado.' });
    }

    console.log(`Buscando registros para o analista ${analyst.name} (${analyst.id})`);

    // Usar o ID correto do analista para buscar os registros
    const { data: helpRequests, error: requestsError } = await supabase
      .from('help_requests')
      .select(`
        *,
        categories (
          id,
          name
        )
      `)
      .eq('analyst_id', analyst.id)
      .order('request_date', { ascending: false });

    if (requestsError) {
      console.error('Erro na consulta:', requestsError);
      throw requestsError;
    }

    if (!helpRequests || helpRequests.length === 0) {
      return res.status(200).json({ 
        count: 0, 
        rows: [],
        metadata: {
          analyst: analyst.name,
          totalRequests: 0
        }
      });
    }

    // Lógica para o modo "profile" (mês atual e mês anterior)
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

      return res.status(200).json({
        currentMonth: currentMonthCount,
        lastMonth: lastMonthCount,
        rows: helpRequests.map(request => ({
          ...request,
          category_name: request.categories?.name || 'Categoria não encontrada',
          full_date: request.request_date 
            ? dayjs(request.request_date).tz("America/Sao_Paulo").format('DD/MM/YYYY')
            : 'Data não disponível'
        })),
        metadata: {
          analyst: analyst.name,
          totalRequests: helpRequests.length
        }
      });
    }

    // Lógica padrão com filtro
    const currentDate = dayjs().tz("America/Sao_Paulo");
    const filterDays = filter ? parseInt(filter, 10) : 30;

    const filteredRows = helpRequests.filter(request => {
      if (!request.request_date) return false;
      
      const requestDate = dayjs(request.request_date).tz("America/Sao_Paulo");
      return currentDate.diff(requestDate, 'day') <= filterDays;
    });

    const datesCount = filteredRows.reduce((acc, request) => {
      const formattedDate = dayjs(request.request_date)
        .tz("America/Sao_Paulo")
        .format('YYYY-MM-DD');
      acc[formattedDate] = (acc[formattedDate] || 0) + 1;
      return acc;
    }, {});

    return res.status(200).json({
      count: filteredRows.length,
      dates: Object.keys(datesCount),
      counts: Object.values(datesCount),
      rows: filteredRows.map(request => ({
        ...request,
        category_name: request.categories?.name || 'Categoria não encontrada',
        full_date: request.request_date 
          ? dayjs(request.request_date).tz("America/Sao_Paulo").format('DD/MM/YYYY')
          : 'Data não disponível'
      })),
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