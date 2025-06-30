import { supabaseAdmin, getUserWithPermissions } from '../../utils/supabase/supabaseClient';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
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
    return res.status(403).json({ error: 'Você não tem permissão para excluir ajuda' });
  }

  const { recordId } = req.body;

  // Validar campo obrigatório
  if (!recordId) {
    return res.status(400).json({ error: 'ID do registro é obrigatório' });
  }

  try {
    // Verificar se o registro existe e pertence ao usuário atual
    const { data: existingRecord, error: fetchError } = await supabaseAdmin
      .from('agent_help_records')
      .select('id, helper_agent_id, helped_agent:users!agent_help_records_helped_agent_id_fkey(name)')
      .eq('id', recordId)
      .eq('helper_agent_id', session.id)
      .single();

    if (fetchError || !existingRecord) {
      return res.status(404).json({ error: 'Registro não encontrado ou você não tem permissão para excluí-lo' });
    }

    // Excluir o registro
    const { error: deleteError } = await supabaseAdmin
      .from('agent_help_records')
      .delete()
      .eq('id', recordId);

    if (deleteError) {
      console.error('Erro ao excluir registro:', deleteError);
      throw deleteError;
    }

    res.status(200).json({ 
      message: 'Registro excluído com sucesso.',
      data: {
        recordId,
        helpedAgentName: existingRecord.helped_agent?.name
      }
    });

  } catch (error) {
    console.error('Erro ao excluir registro de ajuda:', error);
    res.status(500).json({ error: 'Erro ao excluir o registro. Por favor, tente novamente.' });
  }
} 