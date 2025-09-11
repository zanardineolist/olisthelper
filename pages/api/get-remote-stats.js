import { supabaseAdmin } from '../../utils/supabase/supabaseClient';

/**
 * API endpoint para buscar estatísticas e registros de acessos remotos
 * Retorna dados agregados para usuários com permissão can_remote_access
 * e todos os registros da tabela remote_access
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Buscar todos os usuários com permissão can_remote_access
    const { data: usersWithAccess, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, name, email')
      .eq('can_remote_access', true)
      .order('name');

    if (usersError) {
      console.error('Erro ao buscar usuários:', usersError);
      throw usersError;
    }

    // Buscar todos os registros de acesso remoto com todos os campos
    const { data: allRecords, error: recordsError } = await supabaseAdmin
      .from('remote_access')
      .select('*')
      .order('created_at', { ascending: false });

    if (recordsError) {
      console.error('Erro ao buscar registros:', recordsError);
      throw recordsError;
    }

    // Processar dados para criar estatísticas usando support_id como chave primária
    const userStats = usersWithAccess.map(user => {
      // Filtrar registros por support_id (UUID) primeiro, depois por email como fallback
      const userAccesses = allRecords.filter(record => 
        record.support_id === user.id || record.email === user.email
      );
      
      // Calcular acessos no mês atual
      const today = new Date();
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();
      
      const monthlyAccesses = userAccesses.filter(access => {
        const accessDate = new Date(access.created_at);
        return accessDate.getMonth() === currentMonth && 
               accessDate.getFullYear() === currentYear;
      });

      // Calcular acessos nos últimos 30 dias
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const last30DaysAccesses = userAccesses.filter(access => {
        const accessDate = new Date(access.created_at);
        return accessDate >= thirtyDaysAgo;
      });

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        totalAccesses: userAccesses.length,
        monthlyAccesses: monthlyAccesses.length,
        last30DaysAccesses: last30DaysAccesses.length,
        lastAccess: userAccesses.length > 0 ? userAccesses[0].created_at : null
      };
    });

    // Ordenar por total de acessos (decrescente)
    userStats.sort((a, b) => b.totalAccesses - a.totalAccesses);

    // Calcular estatísticas gerais
    const totalUsers = userStats.length;
    const activeUsers = userStats.filter(user => user.totalAccesses > 0).length;
    const totalAccesses = userStats.reduce((sum, user) => sum + user.totalAccesses, 0);
    const monthlyTotalAccesses = userStats.reduce((sum, user) => sum + user.monthlyAccesses, 0);

    const summary = {
      totalUsers,
      activeUsers,
      inactiveUsers: totalUsers - activeUsers,
      totalAccesses,
      monthlyTotalAccesses,
      averageAccessesPerUser: totalUsers > 0 ? Math.round(totalAccesses / totalUsers * 100) / 100 : 0
    };

    return res.status(200).json({
      success: true,
      summary,
      userStats,
      allRecords: allRecords || []
    });

  } catch (error) {
    console.error('Erro ao buscar estatísticas de acesso remoto:', error);
    return res.status(500).json({ 
      error: 'Erro interno do servidor ao buscar estatísticas',
      details: error.message 
    });
  }
}