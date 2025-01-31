// pages/api/shared-messages/[id]/copy.js
import { supabaseAdmin } from '../../../../utils/supabase/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  try {
    // Buscar valor atual primeiro
    const { data: current } = await supabaseAdmin
      .from('shared_responses')
      .select('copy_count')
      .eq('id', id)
      .single();

    const newCount = (current?.copy_count || 0) + 1;

    // Atualizar o contador
    const { data, error } = await supabaseAdmin
      .from('shared_responses')
      .update({ copy_count: newCount })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return res.status(200).json({ copy_count: data.copy_count });
  } catch (error) {
    console.error('Erro ao incrementar contador:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}