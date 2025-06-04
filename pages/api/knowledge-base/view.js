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
      .select('id, view_count')
      .eq('id', entryId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !existingEntry) {
      return res.status(404).json({ error: 'Entrada não encontrada ou não autorizada' });
    }

    // Usar a função SQL para incrementar o contador de visualizações
    const { error: incrementError } = await supabaseAdmin
      .rpc('increment_knowledge_base_view_count', {
        entry_id: entryId
      });

    if (incrementError) {
      console.error('Erro ao incrementar visualizações:', incrementError);
      throw incrementError;
    }

    // Buscar o novo contador de visualizações
    const { data: updatedEntry, error: selectError } = await supabaseAdmin
      .from('knowledge_base_entries')
      .select('view_count, last_viewed_at')
      .eq('id', entryId)
      .single();

    if (selectError) {
      console.error('Erro ao buscar contador atualizado:', selectError);
      throw selectError;
    }

    return res.status(200).json({ 
      view_count: updatedEntry.view_count,
      last_viewed_at: updatedEntry.last_viewed_at,
      message: 'Visualização registrada com sucesso'
    });
  } catch (error) {
    console.error('Erro ao processar requisição:', error);
    return res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    });
  }
} 