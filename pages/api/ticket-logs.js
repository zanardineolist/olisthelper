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
  const userId = req.cookies['user-id'];
  
  if (!userId) {
    return res.status(401).json({ error: 'Usuário não autenticado' });
  }

  try {
    switch (req.method) {
      case 'POST':
        // Adicionar novo log de chamado
        const { ticketUrl, description } = req.body;
        
        if (!ticketUrl) {
          return res.status(400).json({ error: 'URL do chamado é obrigatória' });
        }

        const newLog = await addTicketLog(userId, ticketUrl, description);
        return res.status(201).json(newLog);

      case 'DELETE':
        // Remover log específico
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
            
            const pageSize = 10;
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
    
    if (error.message.includes('Datas inválidas')) {
      return res.status(400).json({ error: 'Datas inválidas fornecidas' });
    }

    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
} 