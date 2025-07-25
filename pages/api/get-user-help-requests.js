// pages/api/get-user-help-requests.js
import { getUserHelpRequests, getUserHelpRequestsComplete } from '../../utils/supabase/helpQueries';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userEmail, includeAgentHelps } = req.query;

  if (!userEmail) {
    return res.status(400).json({ error: 'E-mail do usuário é obrigatório' });
  }

  try {
    // Se includeAgentHelps=true, usar a versão completa que inclui ajudas entre agentes
    const helpRequests = includeAgentHelps === 'true' 
      ? await getUserHelpRequestsComplete(userEmail)
      : await getUserHelpRequests(userEmail);
      
    res.status(200).json(helpRequests);
  } catch (error) {
    console.error('Erro ao obter ajudas solicitadas:', error);
    res.status(500).json({ error: 'Erro ao obter ajudas solicitadas.' });
  }
}