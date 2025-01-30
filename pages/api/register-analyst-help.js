// pages/api/register-analyst-help.js
import { createAnalystHelp } from '../../utils/supabase/helpRequests';
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

    const success = await createAnalystHelp({
      analystId,
      userName,
      userEmail,
      categoryId: categoryData.id,
      description
    });

    if (!success) {
      throw new Error('Erro ao registrar ajuda');
    }

    res.status(200).json({ message: 'Ajuda registrada com sucesso.' });
  } catch (error) {
    console.error('Erro ao registrar ajuda:', error);
    res.status(500).json({ error: 'Erro ao registrar a ajuda. Verifique suas credenciais e a configuração do banco de dados.' });
  }
}