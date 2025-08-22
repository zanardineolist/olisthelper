// Sistema de cache local e sincronização para a extensão Olist Helper
// Gerencia armazenamento local, sincronização e estratégias de cache

class CacheManager {
  constructor() {
    this.caches = {
      messages: {
        key: 'messages_cache',
        ttl: 10 * 60 * 1000, // 10 minutos
        maxSize: 1000, // máximo de mensagens
        data: [],
        lastUpdate: 0,
        version: 1
      },
      search: {
        key: 'search_cache',
        ttl: 5 * 60 * 1000, // 5 minutos
        maxSize: 50, // máximo de buscas
        data: new Map(),
        lastUpdate: 0,
        version: 1
      },
      user: {
        key: 'user_cache',
        ttl: 30 * 60 * 1000, // 30 minutos
        maxSize: 1,
        data: null,
        lastUpdate: 0,
        version: 1
      }
    };
    
    this.syncQueue = [];
    this.isSyncing = false;
    this.syncInterval = 2 * 60 * 1000; // 2 minutos
    this.maxRetries = 3;
    this.retryDelay = 1000;
    
    this.initializeCache();
  }

  // Método público para inicialização (compatibilidade com outros managers)
  async initialize() {
    return this.initializeCache();
  }

  // Inicializar sistema de cache
  async initializeCache() {
    try {
      // Carregar dados do storage
      await this.loadFromStorage();
      
      // Configurar sincronização automática
      this.setupAutoSync();
      
      // Limpar cache expirado
      this.cleanExpiredCache();
      
      console.log('Sistema de cache inicializado');
    } catch (error) {
      console.error('Erro ao inicializar cache:', error);
    }
  }

  // Carregar dados do storage
  async loadFromStorage() {
    return new Promise((resolve) => {
      const keys = Object.keys(this.caches).map(type => this.caches[type].key);
      
      chrome.storage.local.get(keys, (result) => {
        Object.keys(this.caches).forEach(type => {
          const cacheKey = this.caches[type].key;
          if (result[cacheKey]) {
            const cached = result[cacheKey];
            
            // Verificar versão do cache
            if (cached.version === this.caches[type].version) {
              this.caches[type].data = cached.data;
              this.caches[type].lastUpdate = cached.lastUpdate;
            } else {
              // Versão incompatível, limpar cache
              this.clearCache(type);
            }
          }
        });
        resolve();
      });
    });
  }

  // Salvar dados no storage
  async saveToStorage(type) {
    const cache = this.caches[type];
    if (!cache) return;
    
    const cacheData = {
      data: cache.data,
      lastUpdate: cache.lastUpdate,
      version: cache.version
    };
    
    return new Promise((resolve) => {
      chrome.storage.local.set({
        [cache.key]: cacheData
      }, resolve);
    });
  }

  // Verificar se cache é válido
  isCacheValid(type) {
    const cache = this.caches[type];
    if (!cache || !cache.lastUpdate) return false;
    
    const now = Date.now();
    return (now - cache.lastUpdate) < cache.ttl;
  }

  // Obter dados do cache
  async getFromCache(type, key = null) {
    const cache = this.caches[type];
    if (!cache) return null;
    
    if (!this.isCacheValid(type)) {
      return null;
    }
    
    if (type === 'search' && key) {
      return cache.data.get(key) || null;
    }
    
    return cache.data;
  }

  // Armazenar dados no cache
  async setCache(type, data, key = null) {
    const cache = this.caches[type];
    if (!cache) return;
    
    try {
      if (type === 'search' && key) {
        // Cache de busca com chave
        cache.data.set(key, {
          results: data,
          timestamp: Date.now()
        });
        
        // Limitar tamanho do cache de busca
        if (cache.data.size > cache.maxSize) {
          const oldestKey = cache.data.keys().next().value;
          cache.data.delete(oldestKey);
        }
      } else {
        // Cache simples
        if (Array.isArray(data) && data.length > cache.maxSize) {
          // Limitar tamanho do array
          cache.data = data.slice(0, cache.maxSize);
        } else {
          cache.data = data;
        }
      }
      
      cache.lastUpdate = Date.now();
      
      // Salvar no storage
      await this.saveToStorage(type);
      
    } catch (error) {
      console.error(`Erro ao salvar cache ${type}:`, error);
    }
  }

  // Limpar cache específico
  async clearCache(type) {
    const cache = this.caches[type];
    if (!cache) return;
    
    if (type === 'search') {
      cache.data = new Map();
    } else {
      cache.data = Array.isArray(cache.data) ? [] : null;
    }
    
    cache.lastUpdate = 0;
    
    // Remover do storage
    return new Promise((resolve) => {
      chrome.storage.local.remove([cache.key], resolve);
    });
  }

  // Limpar todo o cache
  async clearAllCache() {
    const promises = Object.keys(this.caches).map(type => this.clearCache(type));
    await Promise.all(promises);
    console.log('Todo o cache foi limpo');
  }

  // Limpar cache expirado
  cleanExpiredCache() {
    Object.keys(this.caches).forEach(type => {
      if (!this.isCacheValid(type)) {
        this.clearCache(type);
      }
    });
  }

  // Obter mensagens com cache
  async getMessages(filters = {}) {
    const cacheKey = this.generateCacheKey('messages', filters);
    
    // Tentar obter do cache primeiro
    if (Object.keys(filters).length === 0) {
      const cached = await this.getFromCache('messages');
      if (cached && cached.length > 0) {
        return {
          success: true,
          messages: cached,
          fromCache: true,
          total: cached.length
        };
      }
    }
    
    // Buscar da API
    try {
      const response = await this.fetchFromAPI('messages', filters);
      
      if (response.success && Object.keys(filters).length === 0) {
        // Salvar no cache apenas se não há filtros
        await this.setCache('messages', response.messages);
      }
      
      return {
        ...response,
        fromCache: false
      };
    } catch (error) {
      console.error('Erro ao buscar mensagens:', error);
      
      // Retornar cache mesmo expirado em caso de erro
      const cached = await this.getFromCache('messages');
      if (cached) {
        return {
          success: true,
          messages: cached,
          fromCache: true,
          isStale: true,
          error: error.message
        };
      }
      
      return {
        success: false,
        error: error.message,
        messages: []
      };
    }
  }

  // Buscar mensagens com cache de busca
  async searchMessages(query, filters = {}) {
    const cacheKey = this.generateCacheKey('search', { query, ...filters });
    
    // Verificar cache de busca
    const cached = await this.getFromCache('search', cacheKey);
    if (cached && cached.results) {
      return {
        success: true,
        messages: cached.results,
        fromCache: true,
        total: cached.results.length
      };
    }
    
    // Buscar da API
    try {
      const response = await this.fetchFromAPI('search', { query, ...filters });
      
      if (response.success) {
        // Salvar no cache de busca
        await this.setCache('search', response.messages, cacheKey);
      }
      
      return {
        ...response,
        fromCache: false
      };
    } catch (error) {
      console.error('Erro ao buscar mensagens:', error);
      return {
        success: false,
        error: error.message,
        messages: []
      };
    }
  }

  // Buscar da API através do background script
  async fetchFromAPI(endpoint, params = {}) {
    return new Promise((resolve, reject) => {
      let action;
      
      switch (endpoint) {
        case 'messages':
          action = 'fetchMessages';
          break;
        case 'macros':
          action = 'fetchMacros';
          break;
        case 'search':
          action = 'searchMessages';
          break;
        default:
          reject(new Error('Endpoint não suportado'));
          return;
      }
      
      chrome.runtime.sendMessage({
        action: action,
        filters: params,
        query: params.query,
        limit: params.limit
      }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (response && response.success) {
          resolve(response);
        } else {
          reject(new Error(response?.error || 'Erro desconhecido'));
        }
      });
    });
  }

  // Gerar chave de cache
  generateCacheKey(type, params) {
    if (!params || Object.keys(params).length === 0) {
      return `${type}_default`;
    }
    
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}:${params[key]}`)
      .join('|');
    
    return `${type}_${btoa(sortedParams).replace(/[^a-zA-Z0-9]/g, '')}`;
  }

  // Configurar sincronização automática
  setupAutoSync() {
    // Sincronização periódica
    setInterval(() => {
      this.syncCache();
    }, this.syncInterval);
    
    // Sincronização ao focar na aba (apenas em contextos com DOM)
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
          this.syncCache();
        }
      });
    }
  }

  // Sincronizar cache
  async syncCache() {
    if (this.isSyncing) return;
    
    this.isSyncing = true;
    
    try {
      // Verificar se há dados expirados para sincronizar
      const needsSync = Object.keys(this.caches).some(type => {
        return !this.isCacheValid(type) && this.caches[type].lastUpdate > 0;
      });
      
      if (needsSync) {
        console.log('Sincronizando cache...');
        
        // Recarregar mensagens principais
        await this.getMessages();
        
        console.log('Cache sincronizado');
      }
    } catch (error) {
      console.error('Erro na sincronização:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  // Forçar sincronização
  async forceSync() {
    // Limpar cache
    await this.clearAllCache();
    
    // Recarregar dados
    await this.syncCache();
  }

  // Obter estatísticas do cache
  getCacheStats() {
    const stats = {};
    
    Object.keys(this.caches).forEach(type => {
      const cache = this.caches[type];
      let size = 0;
      
      if (type === 'search') {
        size = cache.data.size;
      } else if (Array.isArray(cache.data)) {
        size = cache.data.length;
      } else if (cache.data) {
        size = 1;
      }
      
      stats[type] = {
        size: size,
        maxSize: cache.maxSize,
        isValid: this.isCacheValid(type),
        lastUpdate: cache.lastUpdate,
        ttl: cache.ttl
      };
    });
    
    return stats;
  }

  // Configurar TTL personalizado
  setTTL(type, ttl) {
    if (this.caches[type]) {
      this.caches[type].ttl = ttl;
    }
  }

  // Configurar tamanho máximo
  setMaxSize(type, maxSize) {
    if (this.caches[type]) {
      this.caches[type].maxSize = maxSize;
    }
  }
}

// Instância global do gerenciador de cache
const cacheManager = new CacheManager();

// Exportar para uso em outros scripts (ES6 modules)
export { CacheManager, cacheManager };

// Compatibilidade com window para content scripts
if (typeof window !== 'undefined') {
  window.cacheManager = cacheManager;
}

console.log('Sistema de cache da extensão carregado');