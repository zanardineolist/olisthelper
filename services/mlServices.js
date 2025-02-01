import {
  searchMLCategories,
  getMLCategoryDetails,
  syncMLCategory,
  getRecentMLCategories
} from '../utils/supabase/mlSupabaseClient';

export const mlServices = {
  async searchCategories(query) {
    try {
      return await searchMLCategories(query);
    } catch (error) {
      console.error('Error searching categories:', error);
      throw error;
    }
  },

  async getCategoryDetails(categoryId) {
    try {
      // Primeiro busca detalhes locais
      const categoryData = await getMLCategoryDetails(categoryId);
      if (!categoryData) {
        // Se não encontrou, tenta sincronizar com o ML
        const syncedData = await syncMLCategory(categoryId);
        if (!syncedData) throw new Error('Categoria não encontrada');
        return syncedData;
      }

      // Se os dados são antigos (mais de 24h), sincroniza em background
      const lastSync = new Date(categoryData.last_sync_at);
      if (Date.now() - lastSync.getTime() > 24 * 60 * 60 * 1000) {
        syncMLCategory(categoryId).catch(console.error); // Sync assíncrono
      }

      return categoryData;
    } catch (error) {
      console.error('Error getting category details:', error);
      throw error;
    }
  },

  async getCategoryVariations(categoryId) {
    try {
      const response = await fetch(
        `https://api.mercadolibre.com/categories/${categoryId}/attributes`
      );

      if (!response.ok) {
        throw new Error('Error fetching category variations');
      }

      const data = await response.json();
      return data.filter(attr => attr.tags.includes('allow_variations'));
    } catch (error) {
      console.error('Error getting category variations:', error);
      throw error;
    }
  },

  async getRecentCategories() {
    try {
      return await getRecentMLCategories();
    } catch (error) {
      console.error('Error getting recent categories:', error);
      throw error;
    }
  }
};