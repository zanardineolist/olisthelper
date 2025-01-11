import { supabase } from '../../utils/supabaseClient';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault("America/Sao_Paulo");

/**
 * Função para validar e obter dados do analista
 */
const getAnalystData = async (analystId) => {
  console.log(`[GET ANALYST DATA] Iniciando busca para analystId: ${analystId}`);

  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', analystId)
      .single();

    if (error) {
      console.error(`[GET ANALYST DATA] Erro na consulta:`, error);
      throw new Error('Erro ao buscar dados do analista');
    }

    if (!data) {
      throw new Error('Analista não encontrado');
    }

    if (!['analyst', 'tax'].includes(data.role)) {
      throw new Error('Usuário não é um analista ou fiscal');
    }

    return data;
  } catch (error) {
    console.error(`[GET ANALYST DATA] Erro durante busca:`, error);
    throw error;
  }
};

/**
 * Função para buscar registros do período
 */
const getPeriodRecords = async (analystId, currentPeriod, previousPeriod) => {
  const tableName = `analyst_${analystId.replace(/-/g, '_')}`;
  
  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .gte('date', previousPeriod.start)
    .lte('date', currentPeriod.end)
    .order('date', { ascending: false });

  if (error) {
    throw new Error(`Erro ao buscar registros: ${error.message}`);
  }

  return data || [];
};

/**
 * Handler principal
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido. Use GET.' });
  }

  const { analystId, filter = '30', viewMode } = req.query;

  if (!analystId) {
    return res.status(400).json({ error: 'ID do analista não fornecido.' });
  }

  try {
    const analyst = await getAnalystData(analystId);
    
    const now = dayjs();
    const currentPeriod = {
      start: now.startOf('month').format('YYYY-MM-DD'),
      end: now.endOf('month').format('YYYY-MM-DD')
    };

    const previousPeriod = {
      start: now.subtract(1, 'month').startOf('month').format('YYYY-MM-DD'),
      end: now.subtract(1, 'month').endOf('month').format('YYYY-MM-DD')
    };

    const records = await getPeriodRecords(analystId, currentPeriod, previousPeriod);

    if (viewMode === 'profile') {
      const currentMonthRecords = records.filter(record =>
        dayjs(record.date).isSame(now, 'month')
      );

      const lastMonthRecords = records.filter(record =>
        dayjs(record.date).isSame(now.subtract(1, 'month'), 'month')
      );

      return res.status(200).json({
        currentMonth: currentMonthRecords.length,
        lastMonth: lastMonthRecords.length,
        analyst: {
          id: analyst.id,
          name: analyst.name,
          email: analyst.email
        }
      });
    }

    // Modo padrão - filtrar por período específico
    const filterDays = parseInt(filter, 10);
    const filterDate = now.subtract(filterDays, 'day').startOf('day');

    const filteredRecords = records.filter(record =>
      dayjs(record.date).isAfter(filterDate)
    );

    // Agrupar por data para contagem
    const dateGroups = filteredRecords.reduce((acc, record) => {
      const date = dayjs(record.date).format('DD/MM/YYYY');
      if (!acc[date]) acc[date] = 0;
      acc[date]++;
      return acc;
    }, {});

    // Preparar dados para o gráfico
    const dates = Object.keys(dateGroups).sort((a, b) =>
      dayjs(a, 'DD/MM/YYYY').unix() - dayjs(b, 'DD/MM/YYYY').unix()
    );

    return res.status(200).json({
      count: filteredRecords.length,
      dates,
      counts: dates.map(date => dateGroups[date]),
      records: filteredRecords.map(record => ({
        date: dayjs(record.date).format('DD/MM/YYYY'),
        time: record.time,
        user_name: record.user_name,
        user_email: record.user_email,
        category: record.category,
        description: record.description
      }))
    });

  } catch (err) {
    console.error('[RECORDS] Erro inesperado:', err);
    return res.status(500).json({
      error: 'Erro inesperado ao buscar registros do analista.',
      message: err.message
    });
  }
}