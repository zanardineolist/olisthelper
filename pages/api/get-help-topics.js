import { getSession } from 'next-auth/react';
import { getHelpTopicsRanking } from '../../utils/supabase/helpQueries';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Verificar autenticação
    const session = await getSession({ req });
    
    if (!session) {
      return res.status(401).json({ message: 'Não autorizado' });
    }

    // Garantir que apenas usuários com role "super" ou "quality" possam acessar
    if (session.role !== 'super' && session.role !== 'quality') {
      return res.status(403).json({ message: 'Permissão negada' });
    }
    
    // Parâmetros de data
    const { startDate, endDate } = req.query;
    
    // Buscar os temas de dúvidas usando a função da camada de acesso a dados
    const topics = await getHelpTopicsRanking(startDate, endDate);

    return res.status(200).json({ topics });
  } catch (error) {
    console.error('Erro ao buscar temas de dúvidas:', error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
} 