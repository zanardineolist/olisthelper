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

    const debugInfo = {
      timestamp: new Date().toISOString(),
      system_status: 'checking',
      tables: {},
      functions: {},
      views: {},
      errors: [],
      recommendations: []
    };

    // 1. Verificar se as tabelas existem
    try {
      const { data: tables, error: tablesError } = await supabaseAdmin
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .in('table_name', ['page_visits', 'user_sessions', 'analytics_hourly', 'analytics_daily']);

      if (tablesError) {
        debugInfo.errors.push(`Tables check error: ${tablesError.message}`);
      } else {
        const tableNames = tables?.map(t => t.table_name) || [];
        debugInfo.tables = {
          page_visits: tableNames.includes('page_visits'),
          user_sessions: tableNames.includes('user_sessions'),
          analytics_hourly: tableNames.includes('analytics_hourly'),
          analytics_daily: tableNames.includes('analytics_daily'),
          total_found: tableNames.length
        };
      }
    } catch (error) {
      debugInfo.errors.push(`Tables verification failed: ${error.message}`);
    }

    // 2. Verificar se as funções existem
    try {
      const { data: functions, error: functionsError } = await supabaseAdmin
        .from('information_schema.routines')
        .select('routine_name')
        .eq('routine_schema', 'public')
        .in('routine_name', [
          'get_online_users_count',
          'upsert_user_session',
          'close_inactive_sessions',
          'insert_page_visits_batch',
          'get_analytics_dashboard_data',
          'refresh_analytics_views'
        ]);

      if (functionsError) {
        debugInfo.errors.push(`Functions check error: ${functionsError.message}`);
      } else {
        const functionNames = functions?.map(f => f.routine_name) || [];
        debugInfo.functions = {
          get_online_users_count: functionNames.includes('get_online_users_count'),
          upsert_user_session: functionNames.includes('upsert_user_session'),
          close_inactive_sessions: functionNames.includes('close_inactive_sessions'),
          insert_page_visits_batch: functionNames.includes('insert_page_visits_batch'),
          get_analytics_dashboard_data: functionNames.includes('get_analytics_dashboard_data'),
          refresh_analytics_views: functionNames.includes('refresh_analytics_views'),
          total_found: functionNames.length
        };
      }
    } catch (error) {
      debugInfo.errors.push(`Functions verification failed: ${error.message}`);
    }

    // 3. Verificar materialized views (usando método alternativo)
    try {
      // Tentar acessar as views diretamente para verificar se existem
      const viewChecks = await Promise.allSettled([
        supabaseAdmin.from('mv_online_users').select('*').limit(1),
        supabaseAdmin.from('mv_top_pages_7d').select('*').limit(1),
        supabaseAdmin.from('mv_hourly_activity_7d').select('*').limit(1)
      ]);

      debugInfo.views = {
        mv_online_users: viewChecks[0].status === 'fulfilled',
        mv_top_pages_7d: viewChecks[1].status === 'fulfilled',
        mv_hourly_activity_7d: viewChecks[2].status === 'fulfilled',
        total_found: viewChecks.filter(check => check.status === 'fulfilled').length
      };

      // Log dos erros das views para debug
      viewChecks.forEach((check, index) => {
        if (check.status === 'rejected') {
          const viewNames = ['mv_online_users', 'mv_top_pages_7d', 'mv_hourly_activity_7d'];
          debugInfo.errors.push(`View ${viewNames[index]} not accessible: ${check.reason?.message}`);
        }
      });
    } catch (error) {
      debugInfo.errors.push(`Views verification failed: ${error.message}`);
      debugInfo.views = {
        mv_online_users: false,
        mv_top_pages_7d: false,
        mv_hourly_activity_7d: false,
        total_found: 0
      };
    }

    // 4. Testar função principal
    try {
      const { data: testData, error: testError } = await supabaseAdmin
        .rpc('get_analytics_dashboard_data', { period_days: 1 });

      if (testError) {
        debugInfo.errors.push(`Dashboard function test failed: ${testError.message}`);
        debugInfo.system_status = 'v2_unavailable';
      } else {
        debugInfo.system_status = 'v2_available';
        debugInfo.test_data_sample = {
          has_summary: !!testData?.summary,
          has_top_pages: !!testData?.topPages,
          has_active_users: !!testData?.activeUsers
        };
      }
    } catch (error) {
      debugInfo.errors.push(`Dashboard function execution failed: ${error.message}`);
      debugInfo.system_status = 'v2_unavailable';
    }

    // 5. Gerar recomendações
    const tablesCount = debugInfo.tables?.total_found || 0;
    const functionsCount = debugInfo.functions?.total_found || 0;
    const viewsCount = debugInfo.views?.total_found || 0;

    if (tablesCount === 0 && functionsCount === 0) {
      debugInfo.recommendations.push('🚨 Sistema V2 não instalado. Execute: analytics_install.sql');
      debugInfo.recommendations.push('📖 Instruções completas: Ver arquivo ANALYTICS_ERROR_SOLUTION.md');
      debugInfo.system_status = 'v2_not_installed';
    } else if (tablesCount < 4) {
      debugInfo.recommendations.push('⚠️ Tabelas incompletas. Re-execute: analytics_install.sql');
      debugInfo.recommendations.push(`📊 Tabelas encontradas: ${tablesCount}/4`);
    } else if (functionsCount < 6) {
      debugInfo.recommendations.push('⚠️ Funções incompletas. Re-execute: analytics_install.sql');
      debugInfo.recommendations.push(`⚙️ Funções encontradas: ${functionsCount}/6`);
    } else if (viewsCount < 3) {
      debugInfo.recommendations.push('⚠️ Views incompletas. Execute: SELECT refresh_analytics_views();');
      debugInfo.recommendations.push(`👁️ Views encontradas: ${viewsCount}/3`);
    } else if (debugInfo.system_status === 'v2_available') {
      debugInfo.recommendations.push('✅ Sistema V2 funcionando corretamente!');
      debugInfo.recommendations.push('🚀 Performance otimizada ativa');
    }

    // Adicionar informações úteis de troubleshooting
    debugInfo.troubleshooting = {
      installation_file: 'supabase/sql/analytics_install.sql',
      test_file: 'supabase/sql/analytics_test.sql',
      documentation: 'ANALYTICS_ERROR_SOLUTION.md',
      debug_endpoint: '/api/analytics/debug',
      system_working: debugInfo.system_status === 'v2_available',
      fallback_available: debugInfo.v1_fallback_available
    };

    // 6. Verificar se APIs V1 ainda funcionam
    try {
      const { data: v1Test } = await supabaseAdmin
        .from('users')
        .select('id', { count: 'exact' })
        .eq('active', true)
        .limit(1);

      debugInfo.v1_fallback_available = true;
    } catch (error) {
      debugInfo.v1_fallback_available = false;
      debugInfo.errors.push(`V1 fallback test failed: ${error.message}`);
    }

    // Headers para debug
    res.setHeader('X-Debug-System-Status', debugInfo.system_status);
    res.setHeader('X-Debug-Tables-Count', tablesCount);
    res.setHeader('X-Debug-Functions-Count', functionsCount);

    res.status(200).json(debugInfo);

  } catch (error) {
    console.error('❌ Debug API error:', error);
    res.status(500).json({ 
      error: 'Debug API error',
      message: error.message,
      system_status: 'debug_failed'
    });
  }
}