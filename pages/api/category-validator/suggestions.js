// pages/api/category-validator/suggestions.js
import { supabase } from '../../../utils/supabase/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  const { query } = req.query;

  try {
    const { data, error } = await supabase
      .from('ml_categories')
      .select('id, hierarquia_completa')
      .or(`id.ilike.%${query}%,hierarquia_completa.ilike.%${query}%`)
      .limit(20);

    if (error) {
      throw error;
    }

    return res.status(200).json({ suggestions: data });
  } catch (error) {
    console.error('Erro ao buscar sugestões:', error);
    return res.status(500).json({
      message: 'Erro ao buscar sugestões',
      error: error.message
    });
  }
}