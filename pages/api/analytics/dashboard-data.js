import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { supabaseAdmin, getUserPermissions } from '../../../utils/supabase/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Limpeza automática de sessões inativas (executa uma vez por hora no máximo)
    const lastCleanup = global.lastCleanup || 0;
    const now = Date.now();
    const oneHour = 60 * 60 * 1000; // 1 hora em ms
    
    if (now - lastCleanup > oneHour) {
      try {
        await supabaseAdmin.rpc('close_inactive_sessions');
        global.lastCleanup = now;
        console.log('🧹 Limpeza automática de sessões executada');
      } catch (cleanupError) {
        console.warn('⚠️ Erro na limpeza automática:', cleanupError.message);
      }
    }

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

    const { period = '7d' } = req.query;

    // Determinar intervalo de tempo
    let dateFilter = '';
    switch (period) {
      case '1d':
        dateFilter = "created_at >= NOW() - INTERVAL '1 day'";
        break;
      case '7d':
        dateFilter = "created_at >= NOW() - INTERVAL '7 days'";
        break;
      case '30d':
        dateFilter = "created_at >= NOW() - INTERVAL '30 days'";
        break;
      case '90d':
        dateFilter = "created_at >= NOW() - INTERVAL '90 days'";
        break;
      default:
        dateFilter = "created_at >= NOW() - INTERVAL '7 days'";
    }

    // Obter usuários online (últimos 5 minutos)
    const { data: onlineUsers } = await supabaseAdmin.rpc('get_online_users_count');

    // Estatísticas gerais
    const { data: totalUsers } = await supabaseAdmin
      .from('users')
      .select('id', { count: 'exact' })
      .eq('active', true);

    // Total de page views no período
    const { data: pageViews } = await supabaseAdmin
      .from('page_visits')
      .select('id', { count: 'exact' })
      .filter('created_at', 'gte', getDateFromPeriod(period));

    // Páginas mais visitadas
    const { data: topPages } = await supabaseAdmin
      .from('page_visits')
      .select('page_path, count(*)')
      .filter('created_at', 'gte', getDateFromPeriod(period))
      .not('page_path', 'like', '/_next%')
      .not('page_path', 'like', '/api%')
      .group('page_path')
      .order('count', { ascending: false })
      .limit(10);

    // Sessões ativas por dia
    const { data: dailySessions } = await supabaseAdmin
      .from('user_sessions')
      .select('started_at::date as date, count(*)')
      .filter('started_at', 'gte', getDateFromPeriod(period))
      .group('date')
      .order('date', { ascending: true });

    // Usuários mais ativos
    const { data: activeUsers } = await supabaseAdmin
      .from('page_visits')
      .select(`
        user_id,
        users!inner(name, email),
        count(*)
      `)
      .filter('created_at', 'gte', getDateFromPeriod(period))
      .group('user_id, users.name, users.email')
      .order('count', { ascending: false })
      .limit(10);

    // Tempo médio de sessão
    const { data: avgSessionTime } = await supabaseAdmin
      .from('user_sessions')
      .select('duration')
      .filter('started_at', 'gte', getDateFromPeriod(period))
      .not('duration', 'is', null)
      .gt('duration', 0);

    const averageSessionDuration = avgSessionTime?.length > 0 
      ? avgSessionTime.reduce((sum, session) => sum + session.duration, 0) / avgSessionTime.length
      : 0;

    // Atividade por hora do dia
    const { data: hourlyActivity } = await supabaseAdmin
      .from('page_visits')
      .select('created_at')
      .filter('created_at', 'gte', getDateFromPeriod(period));

    const activityByHour = Array.from({ length: 24 }, (_, hour) => {
      const count = hourlyActivity?.filter(visit => {
        const visitHour = new Date(visit.created_at).getHours();
        return visitHour === hour;
      }).length || 0;
      return { hour, count };
    });

    res.status(200).json({
      summary: {
        onlineUsers: onlineUsers || 0,
        totalUsers: totalUsers?.length || 0,
        totalPageViews: pageViews?.length || 0,
        averageSessionDuration: Math.round(averageSessionDuration)
      },
      topPages: topPages || [],
      dailySessions: dailySessions || [],
      activeUsers: activeUsers || [],
      activityByHour,
      period
    });

  } catch (error) {
    console.error('Erro ao buscar dados de analytics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

function getDateFromPeriod(period) {
  const now = new Date();
  switch (period) {
    case '1d':
      return new Date(now - 24 * 60 * 60 * 1000).toISOString();
    case '7d':
      return new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
    case '30d':
      return new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
    case '90d':
      return new Date(now - 90 * 24 * 60 * 60 * 1000).toISOString();
    default:
      return new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
  }
} 