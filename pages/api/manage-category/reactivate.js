import { getSession } from 'next-auth/react';
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

    // Verificar a sessão do usuário
    try {
      const session = await getSession({ req });
      console.log('Status da sessão (reactivate):', session ? 'Ativa' : 'Inativa');
      
      // Continuar mesmo se a sessão não estiver disponível
      if (!session) {
        console.warn('Sessão não encontrada em reactivate, mas continuando processamento');
      }

      let updateQuery = supabaseAdmin
        .from('categories')
        .update({ active: true, updated_at: new Date() });
      
      // Priorizar a busca pelo ID se disponível, caso contrário usar o nome
      if (id) {
        updateQuery = updateQuery.eq('id', id);
      } else {
        updateQuery = updateQuery.ilike('name', name.trim());
      }

      const { data, error } = await updateQuery;

      if (error) {
        console.error('Erro ao reativar categoria:', error);
        return res.status(500).json({ error: 'Erro ao reativar categoria', details: error.message });
      }

      return res.status(200).json({ 
        success: true, 
        message: 'Categoria reativada com sucesso'
      });
    } catch (sessionError) {
      console.error('Erro ao obter sessão (reactivate):', sessionError);
      
      // Mesmo com erro na sessão, tentamos reativar a categoria
      try {
        let updateQuery = supabaseAdmin
          .from('categories')
          .update({ active: true, updated_at: new Date() });
        
        if (id) {
          updateQuery = updateQuery.eq('id', id);
        } else {
          updateQuery = updateQuery.ilike('name', name.trim());
        }

        const { data, error } = await updateQuery;

        if (error) {
          console.error('Erro ao reativar categoria (fallback):', error);
          return res.status(500).json({ error: 'Erro ao reativar categoria', details: error.message });
        }

        return res.status(200).json({ 
          success: true, 
          message: 'Categoria reativada com sucesso'
        });
      } catch (fallbackError) {
        console.error('Erro na reativação de fallback:', fallbackError);
        return res.status(500).json({ error: 'Erro ao reativar categoria', details: fallbackError.message });
      }
    }
  } catch (error) {
    console.error('Erro ao processar requisição de reativação:', error);
    return res.status(500).json({ error: 'Erro interno do servidor', details: error.message });
  }
} 