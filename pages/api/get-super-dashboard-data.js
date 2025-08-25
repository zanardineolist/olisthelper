// pages/api/get-super-dashboard-data.js
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import { getUserPermissions } from '../../utils/supabase/supabaseClient';
import { getUserPerformanceByEmail } from '../../utils/supabase/performanceQueriesNew';
import { getUserHelpRequests, getUserHelpRequestsComplete } from '../../utils/supabase/helpQueries';
import { getUserCategoryRanking, getUserCategoryRankingComplete } from '../../utils/supabase/helpQueries';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verificar autenticação
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: 'Não autenticado.' });
  }

  // Verificar permissões - apenas super e quality podem acessar dados de dashboard
  const userPermissions = await getUserPermissions(session.id);
  if (!userPermissions || (session.role !== 'super' && session.role !== 'quality')) {
    return res.status(403).json({ error: 'Acesso negado. Apenas usuários com perfil super ou quality podem acessar estes dados.' });
  }

  const { userEmail, includeAgentHelps } = req.query;

  if (!userEmail) {
    return res.status(400).json({ error: 'E-mail do usuário é obrigatório' });
  }

  try {
    // Obter os dados de desempenho, solicitações de ajuda e ranking de categorias do usuário selecionado
    // Se includeAgentHelps=true, usar versões completas que incluem ajudas entre agentes
    const [performanceData, helpRequests, categoryRanking] = await Promise.all([
      getUserPerformanceByEmail(userEmail),
      includeAgentHelps === 'true' ? getUserHelpRequestsComplete(userEmail) : getUserHelpRequests(userEmail),
      includeAgentHelps === 'true' ? getUserCategoryRankingComplete(userEmail) : getUserCategoryRanking(userEmail),
    ]);

    const responsePayload = {
      performance: performanceData,
      helpRequests,
      categoryRanking,
    };

    return res.status(200).json(responsePayload);
  } catch (error) {
    console.error('Erro ao obter dados do dashboard do supervisor:', error);
    return res.status(500).json({ error: 'Erro ao obter dados do dashboard.' });
  }
}
