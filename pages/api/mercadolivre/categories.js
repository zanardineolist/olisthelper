import MercadoLivreAPI from '../../../utils/mercadolivre';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const ml = new MercadoLivreAPI();
  const { categoryId, search, type } = req.query;

  try {
    // Validar credenciais antes de fazer qualquer requisição
    ml.validateCredentials();
    
    let result;

    switch (type) {
      case 'details':
        if (!categoryId) {
          return res.status(400).json({ error: 'categoryId é obrigatório para detalhes' });
        }
        result = await ml.getCategoryDetails(categoryId);
        break;

      case 'search':
        if (!search) {
          return res.status(400).json({ error: 'Termo de busca é obrigatório' });
        }
        result = await ml.searchCategoriesByText(search);
        break;

      case 'all':
        result = await ml.getAllCategories();
        break;

      case 'attributes':
        if (!categoryId) {
          return res.status(400).json({ error: 'categoryId é obrigatório para atributos' });
        }
        result = await ml.getCategoryAttributes(categoryId);
        break;

      case 'listingtypes':
        result = await ml.getListingTypes();
        break;

      default:
        return res.status(400).json({ error: 'Tipo de consulta inválido' });
    }

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('Erro na API do Mercado Livre:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
} 