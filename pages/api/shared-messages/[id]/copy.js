// pages/api/shared-messages/[id]/copy.js
import { supabaseAdmin } from '../../../../utils/supabase/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  try {
    // Primeiro busca o valor atual
    const { data: currentData, error: readError } = await supabaseAdmin
      .from('shared_responses')
      .select('copy_count')
      .eq('id', id)
      .single();

    if (readError) throw readError;

    // Incrementa usando o valor atual
    const newCount = (currentData.copy_count || 0) + 1;

    // Atualiza com o novo valor
    const { data, error: updateError } = await supabaseAdmin
      .from('shared_responses')
      .update({ copy_count: newCount })
      .eq('id', id)
      .select('copy_count')
      .single();

    if (updateError) throw updateError;

    return res.status(200).json(data);
  } catch (error) {
    console.error('Erro ao incrementar contador:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}