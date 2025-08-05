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

    const { session_id, last_activity } = req.body;

    // Validar dados obrigatórios
    if (!session_id) {
      return res.status(400).json({ error: 'Missing session_id' });
    }

    // Tentar atualizar usando tabela V2 primeiro
    let systemUsed = 'v2_optimized';
    
    try {
      const { error } = await supabaseAdmin
        .from('user_sessions')
        .update({
          last_activity: last_activity || new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('session_id', session_id)
        .eq('user_id', session.id); // Segurança adicional

      if (error) {
        console.error('❌ Error updating session heartbeat V2:', error);
        throw new Error('V2 heartbeat failed');
      }
    } catch (v2Error) {
      console.log('🔄 V2 heartbeat failed, using V1 fallback');
      systemUsed = 'v1_fallback';
      
      // Fallback: apenas logar que a sessão está ativa (sistema V1 não tem heartbeat)
      // Não fazemos nada especial, apenas retornamos sucesso
    }

    // Resposta mínima para heartbeat
    res.status(200).json({ 
      success: true,
      timestamp: new Date().toISOString(),
      system_used: systemUsed
    });

  } catch (error) {
    console.error('❌ Error in heartbeat:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}