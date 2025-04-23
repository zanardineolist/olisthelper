import { 
  getAllRemoteAccess, 
  getUserRemoteAccess, 
  getUserCurrentMonthRemoteAccess 
} from '../../utils/supabase/remoteAccessQueries';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userEmail, filterByMonth } = req.query;

  try {
    if (userEmail) {
      // Buscar registros de um usuário específico
      if (filterByMonth === 'true') {
        // Buscar apenas registros do mês atual
        const monthRecords = await getUserCurrentMonthRemoteAccess(userEmail);
        const allRecords = await getUserRemoteAccess(userEmail);
        
        return res.status(200).json({ monthRecords, allRecords });
      }

      // Se não for solicitado apenas registros do mês, retornar todos os registros do usuário
      const allRecords = await getUserRemoteAccess(userEmail);
      return res.status(200).json({ allRecords });
    }

    // Caso não seja uma requisição de usuário específico, retornar todos os registros
    const allRecords = await getAllRemoteAccess();
    return res.status(200).json({ allRecords });

  } catch (error) {
    console.error('Erro ao buscar registros:', error);
    res.status(500).json({ error: 'Erro ao buscar registros. Tente novamente.' });
  }
}