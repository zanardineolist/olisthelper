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

    const {
      page_path,
      page_title,
      referrer,
      session_id,
      visit_duration,
      user_agent
    } = req.body;

    // Validar dados obrigatórios
    if (!page_path || !session_id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Obter IP do cliente
    const ip_address = req.headers['x-forwarded-for'] || 
                      req.headers['x-real-ip'] || 
                      req.connection.remoteAddress || 
                      req.socket.remoteAddress ||
                      (req.connection.socket ? req.connection.socket.remoteAddress : null);

    // Inserir registro de visita
    const { data, error } = await supabaseAdmin
      .from('page_visits')
      .insert([{
        user_id: session.id,
        page_path,
        page_title: page_title || null,
        referrer: referrer || null,
        session_id,
        ip_address: Array.isArray(ip_address) ? ip_address[0] : ip_address,
        user_agent: user_agent || null,
        visit_duration: visit_duration || 0
      }]);

    if (error) {
      console.error('Erro ao inserir page visit:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    // Atualizar atividade da sessão
    await supabaseAdmin.rpc('update_user_session_activity', {
      session_id_param: session_id,
      user_id_param: session.id
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Erro no tracking de página:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 