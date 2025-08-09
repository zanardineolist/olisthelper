import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { supabaseAdmin } from '../../../utils/supabase/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // Obter o ID ou nome da categoria a ser reativada
    const { id, name } = req.body;
    
    if (!id && !name) {
      return res.status(400).json({ error: 'ID ou nome da categoria é obrigatório' });
    }

    // Verificar a sessão do usuário (requerida)
    const session = await getServerSession(req, res, authOptions);
    if (!session?.id) {
      return res.status(401).json({ error: 'Não autorizado' });
    }

    // Verificar permissões básicas (admin ou can_register_help)
    const { data: me, error: meErr } = await supabaseAdmin
      .from('users')
      .select('id, admin, can_register_help')
      .eq('id', session.id)
      .single();
    if (meErr || !me || !(me.admin || me.can_register_help)) {
      return res.status(403).json({ error: 'Proibido' });
    }

    let updateQuery = supabaseAdmin
      .from('categories')
      .update({ active: true, updated_at: new Date(), updated_by: session.id });
    
    // Priorizar a busca pelo ID se disponível, caso contrário usar o nome
    if (id) {
      updateQuery = updateQuery.eq('id', id);
    } else {
      updateQuery = updateQuery.ilike('name', name.trim());
    }

    const { error } = await updateQuery;

    if (error) {
      console.error('Erro ao reativar categoria:', error);
      return res.status(500).json({ error: 'Erro ao reativar categoria', details: error.message });
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Categoria reativada com sucesso'
    });
  } catch (error) {
    console.error('Erro ao processar requisição de reativação:', error);
    return res.status(500).json({ error: 'Erro interno do servidor', details: error.message });
  }
} 