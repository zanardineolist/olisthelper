import { getSession } from 'next-auth/react';
import { supabaseAdmin } from '../../../utils/supabase/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // Verificar a sessão do usuário
    const session = await getSession({ req });
    if (!session) {
      return res.status(401).json({ error: 'Não autorizado' });
    }

    // Obter o UUID ou nome da categoria a ser reativada
    const { uuid, name } = req.body;
    
    if (!uuid && !name) {
      return res.status(400).json({ error: 'UUID ou nome da categoria é obrigatório' });
    }

    let updateQuery = supabaseAdmin
      .from('categories')
      .update({ active: true, updated_at: new Date() });
    
    // Priorizar a busca pelo UUID se disponível, caso contrário usar o nome
    if (uuid) {
      updateQuery = updateQuery.eq('uuid', uuid);
    } else {
      updateQuery = updateQuery.ilike('name', name.trim());
    }

    const { data, error } = await updateQuery;

    if (error) {
      console.error('Erro ao reativar categoria:', error);
      return res.status(500).json({ error: 'Erro ao reativar categoria' });
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Categoria reativada com sucesso'
    });
  } catch (error) {
    console.error('Erro ao processar requisição:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
} 