// components/CategoryValidator/services/storage.js
const CACHE_KEY = 'categoryValidatorCache';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 horas

export class CategoryCache {
  constructor() {
    this.isBrowser = typeof window !== 'undefined';
  }

  getCache() {
    if (!this.isBrowser) return {};
    try {
      const cache = localStorage.getItem(CACHE_KEY);
      return cache ? JSON.parse(cache) : {};
    } catch (error) {
      console.error('Error reading cache:', error);
      return {};
    }
  }

  setCache(cache) {
    if (!this.isBrowser) return;
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
      console.error('Error saving cache:', error);
    }
  }

  saveCategory(category) {
    try {
      const cache = this.getCache();
      cache[category.id] = {
        data: category,
        timestamp: new Date().getTime()
      };
      this.setCache(cache);
      return true;
    } catch (error) {
      console.error('Error saving category:', error);
      return false;
    }
  }

  getCategory(id) {
    try {
      const cache = this.getCache();
      const entry = cache[id];
      
      if (!entry) return null;

      // Verifica se o cache ainda é válido
      if (new Date().getTime() - entry.timestamp < CACHE_DURATION) {
        return entry.data;
      }

      // Remove entrada expirada
      delete cache[id];
      this.setCache(cache);
      return null;
    } catch (error) {
      console.error('Error getting category:', error);
      return null;
    }
  }

  searchCategories(query) {
    try {
      const cache = this.getCache();
      const searchQuery = query.toLowerCase();
      
      return Object.values(cache)
        .filter(entry => {
          // Verifica se a entrada está válida
          if (new Date().getTime() - entry.timestamp > CACHE_DURATION) {
            return false;
          }

          const category = entry.data;
          return category.id.toLowerCase().includes(searchQuery) || 
                 category.hierarquia_completa.toLowerCase().includes(searchQuery);
        })
        .map(entry => entry.data);
    } catch (error) {
      console.error('Error searching categories:', error);
      return [];
    }
  }

  clearOldCache() {
    try {
      const cache = this.getCache();
      const now = new Date().getTime();
      let hasChanges = false;

      Object.keys(cache).forEach(key => {
        if (now - cache[key].timestamp > CACHE_DURATION) {
          delete cache[key];
          hasChanges = true;
        }
      });

      if (hasChanges) {
        this.setCache(cache);
      }
    } catch (error) {
      console.error('Error clearing old cache:', error);
    }
  }

  clearCache() {
    if (!this.isBrowser) return;
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }
}