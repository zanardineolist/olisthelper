import MercadoLivreAPI from '../../../utils/mercadolivre';

export default async function handler(req, res) {
  const { id } = req.query;
  const ml = new MercadoLivreAPI();
  
  try {
    // Validar credenciais
    ml.validateCredentials();
    
    let data;
    
    if (id) {
      // Buscar categoria específica com detalhes
      const categoryDetails = await ml.getCategoryDetails(id);
      data = categoryDetails;
    } else {
      // Buscar todas as categorias raiz
      const categories = await ml.getAllCategories();
      
      // Estruturar dados para melhor visualização
      data = categories.map(category => ({
        id: category.id,
        name: category.name,
        picture: category.picture,
        permalink: category.permalink,
        total_items_in_this_category: category.total_items_in_this_category,
        children_categories: category.children_categories || [],
        settings: category.settings,
        meta_categ_id: category.meta_categ_id,
        attributable: category.attributable
      }));
    }
    
    // Retornar dados diretamente (sem wrapper success/data)
    res.status(200).json(data);
    
  } catch (err) {
    console.error('Erro na API tree:', err);
    
    // Verificar tipo de erro
    if (err.message.includes('APP_ID') || err.message.includes('SECRET_KEY')) {
      res.status(500).json({ 
        error: 'Credenciais do Mercado Livre não configuradas',
        details: err.message 
      });
    } else if (err.message.includes('404') || err.message.includes('não encontrada')) {
      res.status(404).json({ 
        error: 'Categoria não encontrada',
        details: err.message 
      });
    } else {
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        details: err.message 
      });
    }
  }
} 