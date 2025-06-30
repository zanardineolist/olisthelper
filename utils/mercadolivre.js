// Utilitário para integração com a API do Mercado Livre
class MercadoLivreAPI {
  constructor() {
    this.baseURL = process.env.MERCADO_LIVRE_API_BASE_URL || 'https://api.mercadolibre.com';
    this.siteId = process.env.MERCADO_LIVRE_SITE_ID || 'MLB';
    this.appId = process.env.MERCADO_LIVRE_APP_ID;
    this.secretKey = process.env.MERCADO_LIVRE_SECRET_KEY;
  }

  // Obter token de acesso usando client credentials
  async getAccessToken() {
    try {
      const response = await fetch(`${this.baseURL}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.appId,
          client_secret: this.secretKey
        })
      });

      if (!response.ok) {
        throw new Error(`Erro na autenticação: ${response.status}`);
      }

      const data = await response.json();
      return data.access_token;
    } catch (error) {
      throw new Error(`Erro ao obter token: ${error.message}`);
    }
  }

  // Fazer requisição autenticada
  async makeAuthenticatedRequest(endpoint) {
    try {
      const token = await this.getAccessToken();
      
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Erro na requisição: ${response.status} - ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error(`Erro na requisição autenticada: ${error.message}`);
    }
  }

  // Buscar categoria por ID
  async getCategoryById(categoryId) {
    try {
      return await this.makeAuthenticatedRequest(`/categories/${categoryId}`);
    } catch (error) {
      throw new Error(`Erro ao buscar categoria: ${error.message}`);
    }
  }

  // Listar todas as categorias de um site
  async getAllCategories() {
    try {
      return await this.makeAuthenticatedRequest(`/sites/${this.siteId}/categories`);
    } catch (error) {
      throw new Error(`Erro ao buscar categorias: ${error.message}`);
    }
  }

  // Buscar categorias por texto (busca local nas categorias obtidas)
  async searchCategoriesByText(searchText) {
    try {
      const categories = await this.getAllCategories();
      const searchLower = searchText.toLowerCase();
      
      return categories.filter(category => {
        const name = category.name ? String(category.name).toLowerCase() : '';
        const id = category.id ? String(category.id).toLowerCase() : '';
        return name.includes(searchLower) || id.includes(searchLower);
      }).slice(0, 10); // Limita a 10 resultados
    } catch (error) {
      throw new Error(`Erro na busca: ${error.message}`);
    }
  }

  // Obter atributos de uma categoria
  async getCategoryAttributes(categoryId) {
    try {
      return await this.makeAuthenticatedRequest(`/categories/${categoryId}/attributes`);
    } catch (error) {
      throw new Error(`Erro ao buscar atributos: ${error.message}`);
    }
  }

  // Obter informações sobre tipos de listagem
  async getListingTypes() {
    try {
      return await this.makeAuthenticatedRequest(`/sites/${this.siteId}/listing_types`);
    } catch (error) {
      throw new Error(`Erro ao buscar tipos de listagem: ${error.message}`);
    }
  }

  // Validar item para uma categoria específica
  async validateItem(categoryId, itemData) {
    try {
      const token = await this.getAccessToken();
      
      const response = await fetch(`${this.baseURL}/items/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
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
        attributes: Array.isArray(attributes) ? attributes : []
      };
    } catch (error) {
      throw new Error(`Erro ao obter detalhes: ${error.message}`);
    }
  }

  // Verificar se as credenciais estão configuradas
  validateCredentials() {
    if (!this.appId || !this.secretKey) {
      throw new Error('APP_ID e SECRET_KEY são obrigatórios. Configure as variáveis de ambiente.');
    }
  }
}

export default MercadoLivreAPI; 