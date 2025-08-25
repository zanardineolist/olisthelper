import MercadoLivreAPI from '../../../utils/mercadolivre';
import rateLimiter from '../../../utils/rateLimiter';
import { applyCors } from '../../../utils/corsConfig';

export default async function handler(req, res) {
  // Aplicar configuração de CORS
  applyCors(req, res);
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  // Rate limiting - obter IP do cliente
  const clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
  
  if (!rateLimiter.isAllowed(clientIp)) {
    return res.status(429).json({ 
      error: 'Muitas requisições. Tente novamente em alguns minutos.',
      retryAfter: 900 // 15 minutos em segundos
    });
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