import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { supabaseAdmin } from '../../../utils/supabase/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verificar autenticação
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { session_id } = req.body;

    // Validar dados obrigatórios
    if (!session_id) {
      return res.status(400).json({ error: 'Missing session_id' });
    }

    // Atualizar atividade da sessão
    const { error } = await supabaseAdmin.rpc('update_user_session_activity', {
      session_id_param: session_id,
      user_id_param: session.id
    });

    if (error) {
      console.error('Erro ao atualizar sessão:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Erro no update de sessão:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 