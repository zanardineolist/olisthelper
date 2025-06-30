// Utilitário para integração com a API do Mercado Livre
class MercadoLivreAPI {
  constructor() {
    this.baseURL = process.env.MERCADO_LIVRE_API_BASE_URL || 'https://api.mercadolibre.com';
    this.siteId = process.env.MERCADO_LIVRE_SITE_ID || 'MLB';
  }

  // Buscar categoria por ID
  async getCategoryById(categoryId) {
    try {
      const response = await fetch(`${this.baseURL}/categories/${categoryId}`);
      
      if (!response.ok) {
        throw new Error(`Categoria não encontrada: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error(`Erro ao buscar categoria: ${error.message}`);
    }
  }

  // Listar todas as categorias de um site
  async getAllCategories() {
    try {
      const response = await fetch(`${this.baseURL}/sites/${this.siteId}/categories`);
      
      if (!response.ok) {
        throw new Error(`Erro ao buscar categorias: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error(`Erro ao buscar categorias: ${error.message}`);
    }
  }

  // Buscar categorias por texto (busca local nas categorias obtidas)
  async searchCategoriesByText(searchText) {
    try {
      const categories = await this.getAllCategories();
      const searchLower = searchText.toLowerCase();
      
      return categories.filter(category => 
        category.name.toLowerCase().includes(searchLower) ||
        category.id.toLowerCase().includes(searchLower)
      ).slice(0, 10); // Limita a 10 resultados
    } catch (error) {
      throw new Error(`Erro na busca: ${error.message}`);
    }
  }

  // Obter atributos de uma categoria
  async getCategoryAttributes(categoryId) {
    try {
      const response = await fetch(`${this.baseURL}/categories/${categoryId}/attributes`);
      
      if (!response.ok) {
        throw new Error(`Erro ao buscar atributos: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error(`Erro ao buscar atributos: ${error.message}`);
    }
  }

  // Obter informações sobre tipos de listagem
  async getListingTypes() {
    try {
      const response = await fetch(`${this.baseURL}/sites/${this.siteId}/listing_types`);
      
      if (!response.ok) {
        throw new Error(`Erro ao buscar tipos de listagem: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error(`Erro ao buscar tipos de listagem: ${error.message}`);
    }
  }

  // Validar item para uma categoria específica
  async validateItem(categoryId, itemData) {
    try {
      const response = await fetch(`${this.baseURL}/items/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          category_id: categoryId,
          ...itemData
        })
      });

      return await response.json();
    } catch (error) {
      throw new Error(`Erro na validação: ${error.message}`);
    }
  }

  // Obter informações detalhadas de uma categoria (combina várias chamadas)
  async getCategoryDetails(categoryId) {
    try {
      const [category, attributes] = await Promise.all([
        this.getCategoryById(categoryId),
        this.getCategoryAttributes(categoryId).catch(() => [])
      ]);

      return {
        ...category,
        attributes: attributes || []
      };
    } catch (error) {
      throw new Error(`Erro ao obter detalhes: ${error.message}`);
    }
  }
}

export default MercadoLivreAPI; 