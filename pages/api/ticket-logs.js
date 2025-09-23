import {
  addTicketLog,
  getTicketLogs,
  getTodayTicketCount,
  getTodayHourlyData,
  removeTicketLog,
  getTicketLogStats
} from '../../utils/supabase/ticketLogQueries';

export default async function handler(req, res) {
  // Extrair informações do usuário dos cookies
  const currentUserId = req.cookies['user-id'];
  const userRole = req.cookies['user-role'];
  
  if (!currentUserId) {
    return res.status(401).json({ error: 'Usuário não autenticado' });
  }

  // Para supervisores, permitir consulta de dados de outros usuários
  const { userId: targetUserId } = req.query;
  let userId = currentUserId;

  // Se um userId específico foi fornecido e o usuário atual é supervisor
  if (targetUserId && userRole === 'super') {
    userId = targetUserId;
  } else if (targetUserId && userRole !== 'super') {
    return res.status(403).json({ error: 'Sem permissão para acessar dados de outros usuários' });
  }

  try {
    switch (req.method) {
      case 'POST':
        // Adicionar novo log de chamado (apenas o próprio usuário)
        if (userId !== currentUserId) {
          return res.status(403).json({ error: 'Você só pode adicionar logs para sua própria conta' });
        }

        const { ticketUrl, description, ticketType } = req.body;
        
        if (!ticketUrl) {
          return res.status(400).json({ error: 'URL do chamado é obrigatória' });
        }

        const newLog = await addTicketLog(userId, ticketUrl, description, ticketType);
        return res.status(201).json(newLog);

      case 'DELETE':
        // Remover log específico (apenas o próprio usuário)
        if (userId !== currentUserId) {
          return res.status(403).json({ error: 'Você só pode remover logs da sua própria conta' });
        }

        const { logId } = req.query;
        
        if (!logId) {
          return res.status(400).json({ error: 'ID do log é obrigatório' });
        }

        await removeTicketLog(userId, logId);
        return res.status(200).json({ message: 'Log removido com sucesso' });

      case 'GET':
        const { type, startDate, endDate, page = 1 } = req.query;

        switch (type) {
          case 'today-count':
            // Buscar contagem do dia atual
            const todayCount = await getTodayTicketCount(userId);
            return res.status(200).json({ count: todayCount });

          case 'hourly-data':
            // Buscar dados por hora do dia atual
            const hourlyData = await getTodayHourlyData(userId);
            return res.status(200).json({ data: hourlyData });

          case 'stats':
            // Buscar estatísticas do período
            if (!startDate || !endDate) {
              return res.status(400).json({ error: 'Datas são obrigatórias para estatísticas' });
            }
            const stats = await getTicketLogStats(userId, startDate, endDate);
            return res.status(200).json(stats);

          case 'history':
          default:
            // Buscar histórico de logs com paginação
            if (!startDate || !endDate) {
              return res.status(400).json({ error: 'Datas de início e fim são obrigatórias' });
            }
            
            const pageSize = parseInt(req.query.pageSize) || 10;
            const historyData = await getTicketLogs(
              userId, 
              startDate, 
              endDate, 
              parseInt(page),
              pageSize
            );
            return res.status(200).json(historyData);
        }

      default:
        res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('Erro ao processar requisição:', error);
    
    // Retornar erro mais específico se possível
    if (error.message.includes('URL do chamado inválida')) {
      return res.status(400).json({ error: 'URL do chamado inválida' });
    }
    
    if (error.message.includes('URL deve seguir um dos padrões')) {
      return res.status(400).json({ error: error.message });
    }
    
    if (error.message.includes('Datas inválidas')) {
      return res.status(400).json({ error: 'Datas inválidas fornecidas' });
    }

    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}