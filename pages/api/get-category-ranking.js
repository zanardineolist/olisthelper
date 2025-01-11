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
    // Validar analista
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

    const tableName = `analyst_${analystId}`;

    // Definir período (mês atual)
    const now = dayjs();
    const startDate = now.startOf('month').format('YYYY-MM-DD');
    const endDate = now.endOf('month').format('YYYY-MM-DD');

    // Buscar registros da tabela específica do analista
    const { data: records, error: recordsError } = await supabase
      .from(tableName)
      .select(`
        category,
        date,
        user_name,
        user_email
      `)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });

    if (recordsError) {
      console.error('[CATEGORY RANKING] Erro ao buscar registros:', recordsError);
      return res.status(500).json({ error: 'Erro ao buscar registros.' });
    }

    // Se não houver registros, retornar array vazio
    if (!records || records.length === 0) {
      return res.status(200).json({
        categories: [],
        metadata: {
          analyst: {
            id: analystId,
            name: analyst.name,
            role: analyst.role
          },
          period: {
            start: startDate,
            end: endDate
          },
          tableName: tableName
        }
      });
    }

    // Processar e agrupar registros por categoria
    const categoryStats = records.reduce((acc, record) => {
      const category = record.category || 'Sem Categoria';
      
      if (!acc[category]) {
        acc[category] = {
          count: 0,
          users: new Set(),
          dates: new Set(),
          lastUsage: null
        };
      }

      acc[category].count++;
      acc[category].users.add(record.user_email);
      acc[category].dates.add(record.date);

      const recordDate = dayjs(record.date);
      if (!acc[category].lastUsage || recordDate.isAfter(dayjs(acc[category].lastUsage))) {
        acc[category].lastUsage = record.date;
      }

      return acc;
    }, {});

    // Transformar dados agrupados em array e calcular métricas adicionais
    const ranking = Object.entries(categoryStats)
      .map(([name, data]) => ({
        name,
        count: data.count,
        uniqueUsers: data.users.size,
        uniqueDays: data.dates.size,
        lastUsage: data.lastUsage,
        averagePerUser: +(data.count / data.users.size).toFixed(2),
        averagePerDay: +(data.count / data.dates.size).toFixed(2)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Limitar aos top 10

    // Retornar dados formatados
    return res.status(200).json({
      categories: ranking,
      metadata: {
        analyst: {
          id: analystId,
          name: analyst.name,
          role: analyst.role
        },
        period: {
          start: startDate,
          end: endDate
        },
        tableName: tableName,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (err) {
    console.error('[CATEGORY RANKING] Erro inesperado:', err);
    return res.status(500).json({
      error: 'Erro ao gerar ranking de categorias.',
      message: err.message
    });
  }
}