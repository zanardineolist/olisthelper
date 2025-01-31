// pages/api/shared-messages/[id]/copy.js
import { supabaseAdmin } from '../../../../utils/supabase/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  const { copied } = req.body; // Adiciona verificação se a cópia foi bem sucedida

  if (!copied) {
    return res.status(400).json({ error: 'Copy confirmation required' });
  }

  try {
    // Busca o valor atual antes de atualizar
    const { data: current, error: fetchError } = await supabaseAdmin
      .from('shared_responses')
      .select('copy_count')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    // Incrementa o contador
    const newCount = (current?.copy_count || 0) + 1;
    
    const { data, error } = await supabaseAdmin
      .from('shared_responses')
      .update({ copy_count: newCount })
      .eq('id', id)
      .select('copy_count')
      .single();

    if (error) throw error;

    return res.status(200).json(data);
  } catch (error) {
    console.error('Erro ao incrementar contador:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}