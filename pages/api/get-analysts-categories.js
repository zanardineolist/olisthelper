import { supabase } from '../../utils/supabaseClient';

/**
 * Função para buscar categorias
 */
const getCategories = async () => {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name')
    .order('name', { ascending: true });

  if (error) {
    throw new Error(`Erro ao buscar categorias: ${error.message}`);
  }

  return data || [];
};

/**
 * Função para buscar analistas
 */
const getAnalysts = async () => {
  const { data, error } = await supabase
    .from('users')
    .select(`
      id,
      name,
      email,
      role,
      user_code,
      squad
    `)
    .in('role', ['analyst', 'tax'])
    .order('name', { ascending: true });

  if (error) {
    throw new Error(`Erro ao buscar analistas: ${error.message}`);
  }

  return data || [];
};

/**
 * Função para buscar métricas dos analistas
 */
const getAnalystMetrics = async (analysts) => {
  const metrics = {};

  for (const analyst of analysts) {
    try {
      const { data, error } = await supabase
        .from(`analyst_${analyst.user_code}`)
        .select('id')
        .gte('date', new Date().toISOString().split('T')[0]);

      if (!error) {
        metrics[analyst.id] = {
          todayCount: data?.length || 0
        };
      }
    } catch (err) {
      console.error(`Erro ao buscar métricas para analista ${analyst.name}:`, err);
    }
  }

  return metrics;
};

/**
 * Handler principal
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido. Use GET.' });
  }

  try {
    // Buscar dados em paralelo
    const [categories, analysts] = await Promise.all([
      getCategories(),
      getAnalysts()
    ]);

    // Validar resultados
    if (!categories.length && !analysts.length) {
      console.warn('[CATEGORIES & ANALYSTS] Nenhuma categoria ou analista encontrado.');
      return res.status(404).json({ 
        error: 'Nenhuma categoria ou analista encontrado.'
      });
    }

    // Buscar métricas adicionais dos analistas
    const metrics = await getAnalystMetrics(analysts);

    // Formatar resposta
    const formattedAnalysts = analysts.map(analyst => ({
      id: analyst.id,
      name: analyst.name,
      email: analyst.email,
      role: analyst.role,
      squad: analyst.squad,
      user_code: analyst.user_code,
      metrics: metrics[analyst.id] || { todayCount: 0 }
    }));

    const formattedCategories = categories.map(category => ({
      id: category.id,
      name: category.name
    }));

    return res.status(200).json({
      categories: formattedCategories,
      analysts: formattedAnalysts,
      metadata: {
        totalCategories: categories.length,
        totalAnalysts: analysts.length,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (err) {
    console.error('[CATEGORIES & ANALYSTS] Erro inesperado:', err);
    return res.status(500).json({
      error: 'Erro inesperado ao buscar categorias e analistas.',
      message: err.message
    });
  }
}