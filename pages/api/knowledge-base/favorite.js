import { supabaseAdmin } from '../../../utils/supabase/supabaseClient';

export default async function handler(req, res) {
  // Extrair informações do usuário dos cookies
  const userId = req.cookies['user-id'];
  
  if (!userId) {
    return res.status(401).json({ error: 'Usuário não autenticado' });
  }

  const { method } = req;

  if (method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${method} Not Allowed`);
  }

  const { entryId } = req.body;

  if (!entryId) {
    return res.status(400).json({ error: 'ID da entrada é obrigatório' });
  }

  try {
    // Primeiro, verificar se a entrada existe e pertence ao usuário
    const { data: existingEntry, error: fetchError } = await supabaseAdmin
      .from('knowledge_base_entries')
      .select('id, is_favorite')
      .eq('id', entryId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !existingEntry) {
      return res.status(404).json({ error: 'Entrada não encontrada ou não autorizada' });
    }

    // Alternar o status de favorito
    const newFavoriteStatus = !existingEntry.is_favorite;

    const { data: updatedEntry, error: updateError } = await supabaseAdmin
      .from('knowledge_base_entries')
      .update({
        is_favorite: newFavoriteStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', entryId)
      .eq('user_id', userId)
      .select('id, is_favorite')
      .single();

    if (updateError) {
      console.error('Erro ao atualizar favorito:', updateError);
      throw updateError;
    }

    return res.status(200).json({ 
      isFavorite: updatedEntry.is_favorite,
      message: updatedEntry.is_favorite ? 'Adicionado aos favoritos' : 'Removido dos favoritos'
    });
  } catch (error) {
    console.error('Erro ao processar requisição:', error);
    return res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    });
  }
} 