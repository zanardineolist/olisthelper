// pages/api/ticket-count.js
import {
  addTicketCount,
  removeLastTicketCount,
  getTodayCount,
  getTicketCountHistory,
  clearTodayCounts
} from '../../utils/supabase/ticketCountQueries';

export default async function handler(req, res) {
  // Extrair informações do usuário dos cookies
  const userId = req.cookies['user-id'];
  
  if (!userId) {
    return res.status(401).json({ error: 'Usuário não autenticado' });
  }

  try {
    switch (req.method) {
      case 'POST':
        // Adicionar nova contagem
        const data = await addTicketCount(userId);
        return res.status(200).json(data);

      case 'DELETE':
        if (req.query.action === 'clear') {
          // Limpar todas as contagens do dia
          await clearTodayCounts(userId);
          return res.status(200).json({ message: 'Contagens do dia removidas com sucesso' });
        } else {
          // Remover última contagem
          await removeLastTicketCount(userId);
          return res.status(200).json({ message: 'Última contagem removida com sucesso' });
        }

      case 'GET':
        if (req.query.period) {
          // Buscar histórico de contagens com paginação
          const { startDate, endDate, page = 1 } = req.query;
          const pageSize = 10;
          const historyData = await getTicketCountHistory(
            userId, 
            startDate, 
            endDate, 
            parseInt(page),
            pageSize
          );
          return res.status(200).json(historyData);
        } else {
          // Buscar contagem do dia atual
          const count = await getTodayCount(userId);
          return res.status(200).json({ count });
        }

      default:
        res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('Erro ao processar requisição:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}