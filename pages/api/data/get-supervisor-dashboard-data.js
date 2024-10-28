import { getUserPerformance } from './get-user-performance';
import { getUserHelpRequests } from './get-user-help-requests-data';
import { getUserCategoryRanking } from './get-user-category-ranking-data';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { userEmail, dateRange } = req.query;

  if (!userEmail) {
    return res.status(400).json({ error: 'E-mail do usuário é obrigatório.' });
  }

  try {
    // Executar todas as requisições em paralelo para melhorar a performance
    const [performanceData, helpRequests, categoryRanking] = await Promise.all([
      getUserPerformance(userEmail),
      getUserHelpRequests(userEmail, dateRange),
      getUserCategoryRanking(userEmail, dateRange),
    ]);

    const responsePayload = {
      performance: performanceData,
      helpRequests,
      categoryRanking,
    };

    return res.status(200).json(responsePayload);
  } catch (error) {
    console.error('Erro ao obter dados do dashboard do supervisor:', error);
    return res.status(500).json({ error: 'Erro ao obter dados do dashboard.' });
  }
}

// Função para obter dados de desempenho do usuário
async function getUserPerformance(userEmail) {
  // Simulação de chamada ao Google Sheets, ajuste conforme necessário
  // Aqui utilizamos o módulo `get-user-performance` para reutilizar a lógica existente
  return await getUserPerformance({ query: { userEmail } });
}

// Função para obter solicitações de ajuda do usuário
async function getUserHelpRequests(userEmail, dateRange) {
  // Reutilizar `get-user-help-requests-data` para obter os dados de ajuda
  return await getUserHelpRequests({ query: { userEmail, dateRange } });
}

// Função para obter o ranking das categorias do usuário
async function getUserCategoryRanking(userEmail, dateRange) {
  // Reutilizar `get-user-category-ranking-data` para obter os dados de ranking de categorias
  return await getUserCategoryRanking({ query: { userEmail, dateRange } });
}
