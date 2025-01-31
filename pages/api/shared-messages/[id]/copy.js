// pages/api/shared-messages/[id]/copy.js
import { supabaseAdmin } from '../../../../utils/supabase/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  try {
    const { data, error } = await supabaseAdmin
      .from('shared_responses')
      .update({ copy_count: supabaseAdmin.rpc('increment') })
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