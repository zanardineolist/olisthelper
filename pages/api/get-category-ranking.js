import { supabase } from '../../utils/supabaseClient';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault("America/Sao_Paulo");

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido. Use GET.' });
  }

  const { analystId } = req.query;

  if (!analystId) {
    console.warn('[CATEGORY RANKING] ID do analista não fornecido.');
    return res.status(400).json({ error: 'ID do analista é obrigatório.' });
  }

  try {
    // Primeiro validar o analista
    const { data: analyst, error: analystError } = await supabase
      .from('users')
      .select('*')
      .eq('id', analystId)
      .single();

    if (analystError || !analyst) {
      console.error('[CATEGORY RANKING] Erro ao buscar analista:', analystError);
      return res.status(404).json({ error: 'Analista não encontrado.' });
    }

    if (!['analyst', 'tax'].includes(analyst.role)) {
      console.error('[CATEGORY RANKING] Role inválida:', analyst.role);
      return res.status(403).json({ error: 'Usuário não é analista ou fiscal.' });
    }

    // Definir período (mês atual)
    const now = dayjs();
    const startDate = now.startOf('month').format('YYYY-MM-DD');
    const endDate = now.endOf('month').format('YYYY-MM-DD');

    // Buscar registros do analista
    const { data: records, error: recordsError } = await supabase
      .from(`analyst_${analystId}`)
      .select(`
        category,
        date,
        user_name,
        user_email
      `)
      .gte('date', startDate)
      .lte('date', endDate);

    if (recordsError) {
      console.error('[CATEGORY RANKING] Erro ao buscar registros:', recordsError);
      return res.status(500).json({ error: 'Erro ao buscar registros.' });
    }

    if (!records || records.length === 0) {
      return res.status(200).json({ categories: [] });
    }

    // Processar registros por categoria
    const categoryStats = records.reduce((acc, record) => {
      const category = record.category || 'Sem Categoria';
      
      if (!acc[category]) {
        acc[category] = {
          count: 0,
          users: new Set()
        };
      }

      acc[category].count++;
      acc[category].users.add(record.user_email);

      return acc;
    }, {});

    // Formatar e ordenar resultados
    const ranking = Object.entries(categoryStats)
      .map(([name, data]) => ({
        name,
        count: data.count,
        uniqueUsers: data.users.size
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return res.status(200).json({
      categories: ranking,
      metadata: {
        period: {
          start: startDate,
          end: endDate
        },
        analyst: {
          id: analyst.id,
          name: analyst.name,
          role: analyst.role
        }
      }
    });

  } catch (err) {
    console.error('[CATEGORY RANKING] Erro inesperado:', err);
    return res.status(500).json({
      error: 'Erro ao gerar ranking de categorias.',
      details: err.message
    });
  }
}