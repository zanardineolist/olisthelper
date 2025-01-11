import { supabase } from '../../utils/supabaseClient';

/**
 * Handler para registrar uma dúvida de um usuário
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido. Use POST.' });
  }

  const { user_id, category_id, description, date, time } = req.body;

  // Validação dos campos obrigatórios
  if (!user_id || !category_id || !description || !date || !time) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
  }

  try {
    // Verificar se o usuário existe
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('id', user_id)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
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

    // Inserir a dúvida
    const { data, error } = await supabase
      .from('doubt_records')
      .insert([{ user_id, category_id, description, date, time }]);

    if (error) {
      console.error('[REGISTER DOUBT] Erro ao registrar dúvida:', error.message);
      return res.status(500).json({ error: 'Erro ao registrar dúvida.' });
    }

    return res.status(201).json({ message: 'Dúvida registrada com sucesso.', doubt: data });
  } catch (error) {
    console.error('[REGISTER DOUBT] Erro inesperado:', error.message);
    return res.status(500).json({ error: 'Erro inesperado ao registrar dúvida.' });
  }
}
