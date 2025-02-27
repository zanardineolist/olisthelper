// pages/api/register-analyst-help.js
import { supabaseAdmin } from '../../utils/supabase/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { userName, userEmail, category, description, analystId } = req.body;

  if (!userName || !userEmail || !category || !description || !analystId) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
  }

  try {
    // Buscar o ID da categoria pelo nome
    const { data: categoryData, error: categoryError } = await supabaseAdmin
      .from('categories')
      .select('id')
      .eq('name', category)
      .eq('active', true)
      .single();
    
    if (categoryError || !categoryData) {
      throw new Error('Categoria não encontrada');
    }

    // Registrar a ajuda
    const { error: insertError } = await supabaseAdmin
      .from('help_records')
      .insert([{
        analyst_id: analystId,
        requester_name: userName,
        requester_email: userEmail,
        category_id: categoryData.id,
        description
      }]);

    if (insertError) throw insertError;

    res.status(200).json({ message: 'Ajuda registrada com sucesso.' });
  } catch (error) {
    console.error('Erro ao registrar ajuda:', error);
    res.status(500).json({ error: 'Erro ao registrar a ajuda. Por favor, tente novamente.' });
  }
}