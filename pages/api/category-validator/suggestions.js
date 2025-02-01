// pages/api/category-validator/suggestions.js
import { supabase } from '../../../utils/supabase/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  const { query } = req.query;

  if (!query) {
    return res.status(400).json({ message: 'Query é obrigatória' });
  }

  try {
    // Busca categorias que correspondam ao ID ou nome da hierarquia
    const { data, error } = await supabase
      .from('ml_categories')
      .select('id, hierarquia_completa, is_ultimo_nivel, status')
      .or(`id.ilike.%${query}%,hierarquia_completa.ilike.%${query}%`)
      .order('hierarquia_completa')
      .limit(20);

    if (error) {
      console.error('Erro ao buscar sugestões:', error);
      throw error;
    }

    return res.status(200).json({
      suggestions: data.map(category => ({
        id: category.id,
        hierarquia_completa: category.hierarquia_completa,
        is_ultimo_nivel: category.is_ultimo_nivel,
        status: category.status
      }))
    });

  } catch (error) {
    console.error('Erro ao processar busca:', error);
    return res.status(500).json({
      message: 'Erro ao buscar sugestões',
      error: error.message
    });
  }
}