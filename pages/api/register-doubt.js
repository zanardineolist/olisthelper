// pages/api/register-doubt.js
import { createHelpRequest } from '../../utils/supabase/helpRequests';
import { supabaseAdmin } from '../../utils/supabase/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { analyst, category, description, userName, userEmail } = req.body;

  if (!analyst || !category || !description || !userName || !userEmail) {
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

    // Buscar o ID do usuário solicitante pelo email
    const { data: requesterData, error: requesterError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', userEmail)
      .eq('active', true)
      .single();

    if (requesterError || !requesterData) {
      throw new Error('Usuário solicitante não encontrado');
    }

    const success = await createHelpRequest({
      requesterId: requesterData.id,
      analystId: analyst, // Já deve vir o ID
      categoryId: categoryData.id,
      description
    });

    if (!success) {
      throw new Error('Erro ao registrar dúvida');
    }

    res.status(200).json({ message: 'Dúvida registrada com sucesso.' });
  } catch (error) {
    console.error('Erro ao registrar dúvida:', error);
    res.status(500).json({ error: 'Erro ao registrar a dúvida. Por favor, tente novamente.' });
  }
}