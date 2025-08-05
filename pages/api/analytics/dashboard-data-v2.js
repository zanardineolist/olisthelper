import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { supabaseAdmin, getUserPermissions } from '../../../utils/supabase/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verificar autenticação
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verificar se é admin
    const permissions = await getUserPermissions(session.id);
    if (!permissions?.admin) {
      return res.status(403).json({ error: 'Access denied. Admin access required.' });
    }

    const { period = '7d', refresh = 'false' } = req.query;

    // Determinar número de dias baseado no período
    let periodDays = 7;
    switch (period) {
      case '1d':
        periodDays = 1;
        break;
      case '7d':
        periodDays = 7;
        break;
      case '30d':
        periodDays = 30;
        break;
      case '90d':
        periodDays = 90;
        break;
      default:
        periodDays = 7;
    }

    // Refresh das materialized views se solicitado
    if (refresh === 'true') {
      try {
        await supabaseAdmin.rpc('refresh_materialized_views');
        console.log('🔄 Materialized views refreshed');
      } catch (refreshError) {
        console.warn('⚠️ Could not refresh materialized views:', refreshError.message);
      }
    }

    // Usar função SQL otimizada para obter todos os dados em uma única consulta
    const { data: dashboardData, error } = await supabaseAdmin
      .rpc('get_analytics_dashboard_data', {
        period_days: periodDays
      });

    if (error) {
      console.error('❌ Error fetching dashboard data V2:', error);
      
      // Fallback para sistema V1 se V2 não estiver disponível
      console.log('🔄 Falling back to V1 system...');
      
      try {
        // Importar e usar a API V1 como fallback
        const v1Handler = await import('./dashboard-data');
        return v1Handler.default(req, res);
      } catch (fallbackError) {
        console.error('❌ V1 fallback also failed:', fallbackError);
        return res.status(500).json({ 
          error: 'Analytics system unavailable',
          details: {
            v2_error: error.message,
            v1_fallback_error: fallbackError.message,
            suggestion: 'Please install Analytics V2 system by running analytics_install.sql'
          }
        });
      }
    }

    // Adicionar metadados da resposta
    const responseData = {
      ...dashboardData,
      metadata: {
        period: period,
        period_days: periodDays,
        generated_at: new Date().toISOString(),
        cache_key: `analytics_${period}_${Math.floor(Date.now() / (5 * 60 * 1000))}`, // Cache de 5 minutos
      }
    };

    // Headers de cache
    res.setHeader('Cache-Control', 'public, max-age=300'); // Cache de 5 minutos
    res.setHeader('X-Analytics-Period', period);
    res.setHeader('X-Analytics-Generated', new Date().toISOString());

    res.status(200).json(responseData);

    // Log para debugging
    console.log('✅ Dashboard data served:', {
      userId: session.id,
      period: period,
      dataSize: JSON.stringify(dashboardData).length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error in dashboard data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Função auxiliar para refresh manual das views (se necessário)
export async function refreshAnalyticsViews() {
  try {
    // Refresh das materialized views em paralelo
    await Promise.all([
      supabaseAdmin.rpc('refresh_materialized_view', { view_name: 'mv_online_users' }),
      supabaseAdmin.rpc('refresh_materialized_view', { view_name: 'mv_top_pages_7d' }),
      supabaseAdmin.rpc('refresh_materialized_view', { view_name: 'mv_hourly_activity_7d' })
    ]);
    
    console.log('✅ All materialized views refreshed');
    return true;
  } catch (error) {
    console.error('❌ Error refreshing views:', error);
    return false;
  }
}