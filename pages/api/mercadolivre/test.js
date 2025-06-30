import MercadoLivreAPI from '../../../utils/mercadolivre';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const ml = new MercadoLivreAPI();

  try {
    // Validar credenciais primeiro
    ml.validateCredentials();
    
    // Teste básico - buscar uma categoria conhecida (Eletrônicos)
    const testCategory = await ml.getCategoryById('MLB1000');
    
    // Teste de busca por texto
    const searchTest = await ml.searchCategoriesByText('eletrônicos');
    
    return res.status(200).json({ 
      success: true,
      message: 'API do Mercado Livre funcionando corretamente',
      tests: {
        categoryById: {
          success: !!testCategory,
          categoryName: testCategory?.name || 'N/A'
        },
        searchByText: {
          success: Array.isArray(searchTest),
          resultsCount: searchTest?.length || 0
        }
      },
      config: {
        baseURL: ml.baseURL,
        siteId: ml.siteId
      }
    });
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      error: error.message,
      config: {
        baseURL: ml.baseURL,
        siteId: ml.siteId
      }
    });
  }
} 