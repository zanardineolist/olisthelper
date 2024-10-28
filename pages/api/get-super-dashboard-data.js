// pages/api/get-super-dashboard-data.js
import { getUserPerformance } from '../../utils/get-user-performance';
import { getUserHelpRequests } from '../../utils/get-user-help-requests';
import { getUserCategoryRanking } from '../../utils/get-user-category-ranking';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userEmail } = req.query;

  if (!userEmail) {
    return res.status(400).json({ error: 'E-mail do usuário é obrigatório' });
  }

  try {
    const [performanceData, helpData, categoryData] = await Promise.all([
      getUserPerformance(userEmail),
      getUserHelpRequests(userEmail),
      getUserCategoryRanking(userEmail),
    ]);

    const responsePayload = {
      performance: performanceData,
      helpRequests: helpData,
      categories: categoryData,
    };

    return res.status(200).json(responsePayload);
  } catch (error) {
    console.error('Erro ao obter dados do dashboard do supervisor:', error);
    return res.status(500).json({ error: 'Erro ao obter dados do dashboard.' });
  }
}