import { supabase } from '../../utils/supabaseClient';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

// Configurar dayjs para trabalhar com timezone
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault("America/Sao_Paulo");

const PAGE_SIZE = 20; // Número de registros por página

/**
 * Função para validar e formatar parâmetros de filtro
 */
const validateAndFormatParams = (params) => {
  const {
    currentMonth,
    userEmail,
    startDate,
    endDate,
    page = 1,
    pageSize = PAGE_SIZE
  } = params;

  const now = dayjs();
  let dateRange = {};

  if (currentMonth === 'true') {
    dateRange = {
      start: now.startOf('month').format('YYYY-MM-DD'),
      end: now.endOf('month').format('YYYY-MM-DD')
    };
  } else if (startDate && endDate) {
    dateRange = {
      start: dayjs(startDate).format('YYYY-MM-DD'),
      end: dayjs(endDate).format('YYYY-MM-DD')
    };
  }

  return {
    dateRange,
    userEmail,
    page: parseInt(page),
    pageSize: parseInt(pageSize)
  };
};

/**
 * Função para construir a query base
 */
const buildBaseQuery = (params) => {
  let query = supabase
    .from('remote_access')
    .select(`
      id,
      user_id,
      chamado,
      tema,
      description,
      date,
      time,
      created_at,
      users (
        name,
        email,
        role
      )
    `, { count: 'exact' });

  // Filtrar por data se especificado
  if (params.dateRange.start && params.dateRange.end) {
    query = query
      .gte('date', params.dateRange.start)
      .lte('date', params.dateRange.end);
  }

  // Filtrar por usuário se especificado
  if (params.userEmail) {
    query = query.eq('users.email', params.userEmail);
  }

  return query;
};

/**
 * Handler principal
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido. Use GET.' });
  }

  try {
    // Validar e formatar parâmetros
    const params = validateAndFormatParams(req.query);
    
    // Construir query base
    let query = buildBaseQuery(params);

    // Adicionar paginação
    const from = (params.page - 1) * params.pageSize;
    const to = from + params.pageSize - 1;
    
    query = query
      .order('date', { ascending: false })
      .order('time', { ascending: false })
      .range(from, to);

    // Executar query
    const { data: records, error, count } = await query;

    if (error) {
      console.error(`[REMOTE RECORDS] Erro ao buscar registros: ${error.message}`);
      return res.status(500).json({ error: 'Erro ao buscar registros remotos.' });
    }

    // Processar e formatar registros
    const formattedRecords = records.map(record => ({
      id: record.id,
      date: dayjs(record.date).format('DD/MM/YYYY'),
      time: record.time,
      chamado: record.chamado,
      tema: record.tema,
      description: record.description,
      user: {
        name: record.users?.name,
        email: record.users?.email,
        role: record.users?.role
      },
      created_at: record.created_at
    }));

    // Calcular estatísticas
    const stats = {
      totalRecords: count,
      totalPages: Math.ceil(count / params.pageSize),
      currentPage: params.page,
      recordsPerPage: params.pageSize,
      dateRange: params.dateRange
    };

    return res.status(200).json({
      records: formattedRecords,
      stats,
      metadata: {
        generatedAt: new Date().toISOString(),
        filters: {
          userEmail: params.userEmail,
          dateRange: params.dateRange
        }
      }
    });

  } catch (err) {
    console.error('[REMOTE RECORDS] Erro inesperado:', err);
    return res.status(500).json({
      error: 'Erro inesperado ao buscar registros remotos.',
      message: err.message
    });
  }
}