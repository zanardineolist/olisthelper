import { getSession } from 'next-auth/react';
import { getHelpTopicDetails } from '../../utils/supabase/helpQueries';

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
    
    // Parâmetros necessários
    const { categoryId, startDate, endDate } = req.query;
    
    if (!categoryId) {
      return res.status(400).json({ message: 'ID da categoria é obrigatório' });
    }
    
    // Buscar os detalhes do tema de dúvidas
    const details = await getHelpTopicDetails(categoryId, startDate, endDate);

    return res.status(200).json({ details });
  } catch (error) {
    console.error('Erro ao buscar detalhes do tema:', error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
} 