// pages/api/get-super-dashboard-data.js
import { getUserPerformance } from './get-user-performance';
import { getUserHelpRequests } from './get-user-help-requests';
import { getUserCategoryRanking } from './get-user-category-ranking';
import { getAnalystRecords } from '../../utils/getAnalystSheetDetails';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { userEmail, analystId } = req.query;

  if (!userEmail && !analystId) {
    return res.status(400).json({ error: 'E-mail do usuário ou ID do analista é obrigatório' });
  }

  try {
    let responsePayload = {};

    // Obter dados do usuário comum, se `userEmail` for fornecido
    if (userEmail) {
      const [performanceData, helpRequests, categoryRanking] = await Promise.all([
        getUserPerformance(userEmail),
        getUserHelpRequests(userEmail),
        getUserCategoryRanking(userEmail),
      ]);

      responsePayload = {
        performance: performanceData,
        helpRequests,
        categoryRanking,
      };
    }

    // Obter registros do analista, se `analystId` for fornecido
    if (analystId) {
      const analystRecords = await getAnalystRecords(analystId);

      responsePayload = {
        ...responsePayload,
        analystRecords,
      };
    }

    return res.status(200).json(responsePayload);
  } catch (error) {
    console.error('Erro ao obter dados do dashboard do supervisor:', error);
    return res.status(500).json({ error: 'Erro ao obter dados do dashboard.' });
  }
}
