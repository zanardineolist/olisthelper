import { supabase } from '../../utils/supabaseClient';

/**
 * Handler para listar todas as categorias e analistas
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido. Use GET.' });
  }

  try {
    // Consulta todas as categorias
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('id, name')
      .order('name', { ascending: true });

    if (categoriesError) {
      console.error(`[CATEGORIES] Erro ao buscar categorias: ${categoriesError.message}`);
      return res.status(500).json({ error: 'Erro ao buscar categorias.' });
    }

    // Consulta todos os analistas
    const { data: analysts, error: analystsError } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('role', 'analyst')
      .order('name', { ascending: true });

    if (analystsError) {
      console.error(`[ANALYSTS] Erro ao buscar analistas: ${analystsError.message}`);
      return res.status(500).json({ error: 'Erro ao buscar analistas.' });
    }

    if (!categories.length && !analysts.length) {
      console.warn('[CATEGORIES & ANALYSTS] Nenhuma categoria ou analista encontrado.');
      return res.status(404).json({ error: 'Nenhuma categoria ou analista encontrado.' });
    }

    return res.status(200).json({
      categories,
      analysts,
    });
  } catch (err) {
    console.error('[CATEGORIES & ANALYSTS] Erro inesperado:', err);
    return res.status(500).json({ error: 'Erro inesperado ao buscar categorias e analistas.' });
  }
}
