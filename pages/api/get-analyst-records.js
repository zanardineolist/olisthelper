import { supabase } from '../../utils/supabaseClient';
import dayjs from 'dayjs';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido. Use GET.' });
  }

  const { analystId, mode = 'full' } = req.query;

  if (!analystId) {
    console.warn('[ANALYST RECORDS] ID do analista não fornecido.');
    return res.status(400).json({ error: 'ID do analista é obrigatório.' });
  }

  try {
    // Validar analista
    const { data: analyst, error: analystError } = await supabase
      .from('users')
      .select('*')
      .eq('id', analystId)
      .single();

    if (analystError || !analyst) {
      console.error('[ANALYST RECORDS] Erro ao buscar analista:', analystError);
      return res.status(404).json({ error: 'Analista não encontrado.' });
    }

    if (!['analyst', 'tax'].includes(analyst.role)) {
      console.error('[ANALYST RECORDS] Role inválida:', analyst.role);
      return res.status(403).json({ error: 'Usuário não é analista ou fiscal.' });
    }

    // Definir períodos
    const now = dayjs();
    const currentMonthStart = now.startOf('month').format('YYYY-MM-DD');
    const currentMonthEnd = now.endOf('month').format('YYYY-MM-DD');
    const lastMonthStart = now.subtract(1, 'month').startOf('month').format('YYYY-MM-DD');
    const lastMonthEnd = now.subtract(1, 'month').endOf('month').format('YYYY-MM-DD');

    // Buscar registros em paralelo
    const [currentMonthRecords, lastMonthRecords] = await Promise.all([
      // Registros do mês atual
      supabase
        .from(`analyst_${analystId}`)
        .select(mode === 'profile' ? 'date, category, description' : '*')
        .gte('date', currentMonthStart)
        .lte('date', currentMonthEnd)
        .order('date', { ascending: false }),

      // Registros do mês anterior
      supabase
        .from(`analyst_${analystId}`)
        .select('date')
        .gte('date', lastMonthStart)
        .lte('date', lastMonthEnd)
    ]);

    if (currentMonthRecords.error) {
      throw new Error(`Erro ao buscar registros do mês atual: ${currentMonthRecords.error.message}`);
    }

    if (lastMonthRecords.error) {
      throw new Error(`Erro ao buscar registros do mês anterior: ${lastMonthRecords.error.message}`);
    }

    // Formatar response de acordo com o mode
    const response = {
      currentMonth: currentMonthRecords.data.length,
      lastMonth: lastMonthRecords.data.length
    };

    if (mode === 'full') {
      response.records = currentMonthRecords.data;
    } else if (mode === 'profile') {
      response.records = currentMonthRecords.data.map(record => ({
        date: dayjs(record.date).format('DD/MM/YYYY'),
        category: record.category,
        description: record.description
      }));
    }

    // Adicionar metadados
    response.metadata = {
      period: {
        current: {
          start: currentMonthStart,
          end: currentMonthEnd
        },
        last: {
          start: lastMonthStart,
          end: lastMonthEnd
        }
      },
      analyst: {
        id: analyst.id,
        name: analyst.name,
        role: analyst.role
      }
    };

    return res.status(200).json(response);

  } catch (err) {
    console.error('[ANALYST RECORDS] Erro inesperado:', err);
    return res.status(500).json({
      error: 'Erro ao buscar registros do analista.',
      details: err.message
    });
  }
}