import { getAnalystRecords, getAnalystLeaderboard, getCategoryRanking } from '../../utils/supabase/helpQueries';

export default async function handler(req, res) {
  const { 
    analystId, 
    mode, 
    filter,
    startDate, 
    endDate,
    includeUserDetails,
    includeCategoryDetails 
  } = req.query;

  if (!analystId) {
    return res.status(400).json({ error: 'ID do analista é obrigatório' });
  }
  
  // Validar datas se fornecidas
  if ((startDate && !endDate) || (!startDate && endDate)) {
    return res.status(400).json({ error: 'Se uma data for fornecida, ambas startDate e endDate devem ser informadas' });
  }
  
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ error: 'Formato de data inválido. Use YYYY-MM-DD' });
    }
    
    if (start > end) {
      return res.status(400).json({ error: 'A data inicial não pode ser posterior à data final' });
    }
  }

  try {
    // Tratamento específico para solicitações de leaderboard
    if (includeUserDetails === 'true') {
      const data = await getAnalystLeaderboard(analystId, startDate, endDate);
      if (!data) {
        return res.status(404).json({ error: 'Nenhum registro encontrado' });
      }
      return res.status(200).json(data);
    }
    
    // Tratamento específico para solicitações de categorias
    if (includeCategoryDetails === 'true') {
      const data = await getCategoryRanking(analystId, startDate, endDate);
      if (!data) {
        return res.status(404).json({ error: 'Nenhum registro encontrado' });
      }
      return res.status(200).json(data);
    }

    // Se temos startDate e endDate, vamos lidar com eles de forma especial
    if (startDate && endDate) {
      // Chamar getAnalystRecords com parâmetros específicos para intervalo de datas
      const data = await getAnalystRecords(
        analystId, 
        startDate, 
        mode || 'standard', 
        endDate
      );
      
      if (!data) {
        return res.status(404).json({ error: 'Nenhum registro encontrado' });
      }
      
      return res.status(200).json(data);
    } else {
      // Comportamento original usando o parâmetro de filtro
      const data = await getAnalystRecords(analystId, filter, mode);
      
      if (!data) {
        return res.status(404).json({ error: 'Nenhum registro encontrado' });
      }
      
      return res.status(200).json(data);
    }
  } catch (error) {
    console.error('Erro ao obter registros do analista:', error);
    res.status(500).json({ error: 'Erro ao obter registros.' });
  }
}