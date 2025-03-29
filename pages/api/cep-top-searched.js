import { supabaseAdmin } from '../../utils/supabase/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const limit = req.query.limit || 3;

  try {
    // Buscar os CEPs mais consultados baseado no contador de buscas
    const { data, error } = await supabaseAdmin
      .from('cep_ibge_cache')
      .select('cep, data, updated_at, search_count')
      .order('search_count', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Erro ao consultar o banco de dados: ${error.message}`);
    }

    // Formatar os resultados
    const topCeps = data.map(item => ({
      cep: item.cep,
      data: item.data,
      lastUpdated: item.updated_at,
      searchCount: item.search_count || 0
    }));

    return res.status(200).json(topCeps);
  } catch (error) {
    console.error('Erro ao processar solicitação:', error);
    return res.status(500).json({ error: 'Erro ao buscar CEPs populares', message: error.message });
  }
} 