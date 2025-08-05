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

    const { events, session_data } = req.body;

    // Validar dados obrigatórios
    if (!events || !Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ error: 'No events provided' });
    }

    if (!session_data?.sessionId) {
      return res.status(400).json({ error: 'Missing session data' });
    }

    // Obter IP do cliente
    const ip_address = req.headers['x-forwarded-for'] || 
                      req.headers['x-real-ip'] || 
                      req.connection.remoteAddress || 
                      req.socket.remoteAddress ||
                      (req.connection.socket ? req.connection.socket.remoteAddress : null);

    // Processar eventos e preparar para inserção em batch
    const validEvents = [];
    const now = new Date().toISOString();

    for (const event of events) {
      // Validar evento individual
      if (!event.page_path || !event.session_id) {
        console.warn('⚠️ Skipping invalid event:', event);
        continue;
      }

      // Filtrar páginas internas/APIs
      if (event.page_path.startsWith('/_next') || 
          event.page_path.startsWith('/api')) {
        continue;
      }

      validEvents.push({
        user_id: session.id,
        session_id: event.session_id,
        page_path: event.page_path,
        page_title: event.page_title || null,
        referrer: event.referrer || null,
        ip_address: Array.isArray(ip_address) ? ip_address[0] : ip_address,
        user_agent: event.user_agent || null,
        visit_duration: parseInt(event.visit_duration) || 0,
        created_at: event.timestamp || now
      });
    }

    if (validEvents.length === 0) {
      return res.status(200).json({ 
        success: true, 
        message: 'No valid events to process',
        processed: 0 
      });
    }

    // Tentar usar sistema V2 primeiro
    let insertResult = null;
    let useV1Fallback = false;

    try {
      // Upsert da sessão do usuário
      const sessionResult = await supabaseAdmin.rpc('upsert_user_session', {
        p_session_id: session_data.sessionId,
        p_user_id: session.id,
        p_ip_address: Array.isArray(ip_address) ? ip_address[0] : ip_address,
        p_user_agent: validEvents[0]?.user_agent || null
      });

      if (sessionResult.error) {
        console.error('❌ Error upserting session:', sessionResult.error);
        throw new Error('Session upsert failed');
      }

      // Inserir eventos em batch usando função SQL otimizada
      const { data: batchResult, error: insertError } = await supabaseAdmin
        .rpc('insert_page_visits_batch', {
          visits: JSON.stringify(validEvents)
        });

      if (insertError) {
        console.error('❌ Error inserting events batch:', insertError);
        throw new Error('Batch insert failed');
      }

      insertResult = batchResult;

    } catch (v2Error) {
      console.log('🔄 V2 batch failed, falling back to V1 individual inserts:', v2Error.message);
      useV1Fallback = true;

      // Fallback: inserir eventos individualmente (sistema V1)
      try {
        let successCount = 0;
        for (const event of validEvents) {
          const { error: individualError } = await supabaseAdmin
            .from('page_visits')
            .insert([event]);

          if (!individualError) {
            successCount++;
          } else {
            console.warn('⚠️ Individual insert failed:', individualError);
          }
        }
        insertResult = successCount;
      } catch (v1Error) {
        console.error('❌ V1 fallback also failed:', v1Error);
        return res.status(500).json({ 
          error: 'Analytics system unavailable',
          details: {
            v2_error: v2Error.message,
            v1_fallback_error: v1Error.message,
            suggestion: 'Please install Analytics V2 system by running analytics_install.sql'
          }
        });
      }
    }

    // Estatísticas de resposta
    const responseData = {
      success: true,
      processed: insertResult || validEvents.length,
      session_data: {
        sessionId: session_data.sessionId,
        lastActivity: now,
        pageViews: session_data.pageViews + validEvents.length
      },
      server_time: now,
      system_used: useV1Fallback ? 'v1_fallback' : 'v2_optimized'
    };

    // Log para debugging (remover em produção)
    console.log('✅ Analytics batch processed:', {
      userId: session.id,
      sessionId: session_data.sessionId,
      eventsReceived: events.length,
      eventsProcessed: validEvents.length,
      eventsInserted: insertResult || validEvents.length
    });

    res.status(200).json(responseData);

  } catch (error) {
    console.error('❌ Error in analytics batch processing:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Configuração para permitir payloads maiores
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb', // Permitir até 1MB para batches grandes
    },
  },
};