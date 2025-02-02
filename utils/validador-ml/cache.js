// utils/validador-ml/cache.js
const CACHE_PREFIX = 'validadorML_';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export const categoryCache = {
  setCategories(categories) {
    try {
      localStorage.setItem(`${CACHE_PREFIX}categories`, JSON.stringify(categories));
      localStorage.setItem(`${CACHE_PREFIX}timestamp`, Date.now().toString());
    } catch (error) {
      console.error('Erro ao salvar no cache:', error);
    }
  },

  getCategories() {
    try {
      const timestamp = localStorage.getItem(`${CACHE_PREFIX}timestamp`);
      const isCacheValid = timestamp && (Date.now() - parseInt(timestamp) < CACHE_DURATION);

      if (!isCacheValid) {
        this.clearCache();
        return null;
      }

      const categories = localStorage.getItem(`${CACHE_PREFIX}categories`);
      return categories ? JSON.parse(categories) : null;
    } catch (error) {
      console.error('Erro ao ler do cache:', error);
      return null;
    }
  },

  setCategoryDetails(categoryId, details) {
    try {
      localStorage.setItem(
        `${CACHE_PREFIX}details_${categoryId}`,
        JSON.stringify({
          data: details,
          timestamp: Date.now()
        })
      );
    } catch (error) {
      console.error('Erro ao salvar detalhes no cache:', error);
    }
  },

  getCategoryDetails(categoryId) {
    try {
      const cached = localStorage.getItem(`${CACHE_PREFIX}details_${categoryId}`);
      if (!cached) return null;

      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp > CACHE_DURATION) {
        localStorage.removeItem(`${CACHE_PREFIX}details_${categoryId}`);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Erro ao ler detalhes do cache:', error);
      return null;
    }
  },

  clearCache() {
    try {
      Object.keys(localStorage)
        .filter(key => key.startsWith(CACHE_PREFIX))
        .forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.error('Erro ao limpar cache:', error);
    }
  }
};