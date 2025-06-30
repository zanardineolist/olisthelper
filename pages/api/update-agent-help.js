import { supabaseAdmin, getUserWithPermissions } from '../../utils/supabase/supabaseClient';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';

export default async function handler(req, res) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Verificar autenticação
  const session = await getServerSession(req, res, authOptions);
  if (!session?.id) {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  // Verificar permissão can_register_help
  const helperUser = await getUserWithPermissions(session.id);
  if (!helperUser?.can_register_help) {
    return res.status(403).json({ error: 'Você não tem permissão para editar ajuda' });
  }

  const { recordId, category, description } = req.body;

  // Validar campos obrigatórios
  if (!recordId || !category || !description) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
  }

  try {
    // Verificar se o registro existe e pertence ao usuário atual
    const { data: existingRecord, error: fetchError } = await supabaseAdmin
      .from('agent_help_records')
      .select('id, helper_agent_id')
      .eq('id', recordId)
      .eq('helper_agent_id', session.id)
      .single();

    if (fetchError || !existingRecord) {
      return res.status(404).json({ error: 'Registro não encontrado ou você não tem permissão para editá-lo' });
    }

    // Buscar o ID da categoria pelo nome
    const { data: categoryData, error: categoryError } = await supabaseAdmin
      .from('categories')
      .select('id')
      .eq('name', category)
      .eq('active', true)
      .single();
    
    if (categoryError || !categoryData) {
      return res.status(400).json({ error: 'Categoria não encontrada' });
    }

    // Atualizar o registro
    const { error: updateError } = await supabaseAdmin
      .from('agent_help_records')
      .update({
        category_id: categoryData.id,
        description: description.trim(),
        updated_at: new Date().toISOString()
      })
      .eq('id', recordId);

    if (updateError) {
      console.error('Erro ao atualizar registro:', updateError);
      throw updateError;
    }

    res.status(200).json({ 
      message: 'Registro atualizado com sucesso.',
      data: {
        recordId,
        category,
        description: description.trim()
      }
    });

  } catch (error) {
    console.error('Erro ao atualizar registro de ajuda:', error);
    res.status(500).json({ error: 'Erro ao atualizar o registro. Por favor, tente novamente.' });
  }
} 