import { supabaseAdmin } from '../../../utils/supabase/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verificar se é uma chamada do cron job do Vercel ou local
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Executar função de limpeza de sessões inativas
    const { error } = await supabaseAdmin.rpc('close_inactive_sessions');

    if (error) {
      console.error('Erro ao fechar sessões inativas:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    res.status(200).json({ 
      success: true, 
      message: 'Sessões inativas fechadas com sucesso',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro no cleanup de sessões:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 