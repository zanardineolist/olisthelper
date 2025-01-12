import { supabase } from '../../utils/supabaseClient';

/**
 * Handler para registrar uma solicitação de ajuda por um analista
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido. Use POST.' });
  }

  const { analyst_id, user_id, category_id, description, date, time } = req.body;

  // Validação dos campos obrigatórios
  if (!analyst_id || !user_id || !category_id || !description || !date || !time) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
  }

  try {
    // Verificar se o analista existe
    const { data: analyst, error: analystError } = await supabase
      .from('users')
      .select('id')
      .eq('id', analyst_id)
      .eq('role', 'analyst')
      .single();

    if (analystError || !analyst) {
      return res.status(404).json({ error: 'Analista não encontrado.' });
    }

    // Verificar se a categoria existe
    const { data: category, error: categoryError } = await supabase
      .from('categories')
      .select('id')
      .eq('id', category_id)
      .single();

    if (categoryError || !category) {
      return res.status(404).json({ error: 'Categoria não encontrada.' });
    }

    // Inserir a solicitação de ajuda
    const { data, error } = await supabase
      .from('help_records')
      .insert([{ analyst_id, user_id, category_id, description, date, time }]);

    if (error) {
      console.error('[REGISTER HELP] Erro ao registrar ajuda:', error.message);
      return res.status(500).json({ error: 'Erro ao registrar solicitação de ajuda.' });
    }

    return res.status(201).json({ message: 'Solicitação de ajuda registrada com sucesso.', record: data });
  } catch (error) {
    console.error('[REGISTER HELP] Erro inesperado:', error.message);
    return res.status(500).json({ error: 'Erro inesperado ao registrar solicitação de ajuda.' });
  }
}
