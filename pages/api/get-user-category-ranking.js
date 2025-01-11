import { supabase } from '../../utils/supabaseClient';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

// Configurar dayjs para trabalhar com timezone
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault("America/Sao_Paulo");

/**
 * Função para validar e obter dados do usuário
 */
const validateUser = async (userId) => {
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !user) {
    throw new Error('Usuário não encontrado');
  }

  return user;
};

/**
 * Função para buscar registros de ajuda e calcular ranking
 */
const calculateCategoryRanking = async (userId, dateRange) => {
  const { data: helpRecords, error } = await supabase
    .from('help_records')
    .select(`
      id,
      analyst_id,
      category_id,
      description,
      date,
      time,
      analysts:users!help_records_analyst_id_fkey (
        name,
        email,
        role
      ),
      categories (
        id,
        name
      )
    `)
    .eq('user_id', userId)
    .gte('date', dateRange.start)
    .lte('date', dateRange.end)
    .order('date', { ascending: false });

  if (error) {
    throw new Error(`Erro ao buscar registros de ajuda: ${error.message}`);
  }

  if (!helpRecords?.length) {
    return {
      ranking: [],
      stats: {
        totalRequests: 0,
        uniqueCategories: 0,
        uniqueAnalysts: 0
      }
    };
  }

  // Calcular contagem por categoria
  const categoryData = helpRecords.reduce((acc, record) => {
    const categoryId = record.category_id;
    const categoryName = record.categories?.name || 'Sem Categoria';
    
    if (!acc[categoryId]) {
      acc[categoryId] = {
        id: categoryId,
        name: categoryName,
        count: 0,
        analysts: new Set(),
        lastUsage: null,
        descriptions: new Set(),
        firstOccurrence: record.date
      };
    }

    acc[categoryId].count++;
    acc[categoryId].analysts.add(record.analyst_id);
    acc[categoryId].descriptions.add(record.description);
    
    // Atualizar último uso
    const recordDate = dayjs(record.date);
    if (!acc[categoryId].lastUsage || recordDate.isAfter(dayjs(acc[categoryId].lastUsage))) {
      acc[categoryId].lastUsage = record.date;
    }

    // Atualizar primeira ocorrência
    if (recordDate.isBefore(dayjs(acc[categoryId].firstOccurrence))) {
      acc[categoryId].firstOccurrence = record.date;
    }

    return acc;
  }, {});

  // Converter para array e ordenar
  const ranking = Object.values(categoryData)
    .map(category => ({
      id: category.id,
      name: category.name,
      count: category.count,
      uniqueAnalysts: category.analysts.size,
      uniqueDescriptions: category.descriptions.size,
      lastUsage: category.lastUsage,
      firstOccurrence: category.firstOccurrence,
      averagePerAnalyst: +(category.count / category.analysts.size).toFixed(2)
    }))
    .sort((a, b) => b.count - a.count);

  // Calcular estatísticas gerais
  const stats = {
    totalRequests: helpRecords.length,
    uniqueCategories: ranking.length,
    uniqueAnalysts: new Set(helpRecords.map(r => r.analyst_id)).size,
    averageRequestsPerCategory: +(helpRecords.length / ranking.length).toFixed(2)
  };

  return { ranking, stats };
};

/**
 * Handler principal
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido. Use GET.' });
  }

  const { userId } = req.query;

  if (!userId) {
    console.warn('[USER CATEGORY RANKING] ID do usuário não fornecido.');
    return res.status(400).json({ error: 'ID do usuário não fornecido.' });
  }

  try {
    // Validar usuário
    const user = await validateUser(userId);

    // Definir período (mês atual)
    const now = dayjs();
    const dateRange = {
      start: now.startOf('month').format('YYYY-MM-DD'),
      end: now.endOf('month').format('YYYY-MM-DD')
    };

    // Calcular ranking
    const { ranking, stats } = await calculateCategoryRanking(userId, dateRange);

    // Pegar top 10 categorias
    const topCategories = ranking.slice(0, 10);

    return res.status(200).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      categories: topCategories,
      stats,
      metadata: {
        period: {
          start: dateRange.start,
          end: dateRange.end
        },
        generatedAt: new Date().toISOString(),
        totalCategories: ranking.length
      }
    });

  } catch (err) {
    console.error('[USER CATEGORY RANKING] Erro inesperado:', err);
    return res.status(500).json({
      error: 'Erro inesperado ao gerar ranking de categorias.',
      message: err.message
    });
  }
}