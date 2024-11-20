import EventEmitter from 'events';

let edgeConfig;
if (typeof window === 'undefined') {
  edgeConfig = require('@vercel/edge-config');
}

type CacheData = {
  data: any;
  timestamp: number;
  expiry: number;
};

class Cache extends EventEmitter {
  private store: Map<string, CacheData>;
  private maxSize: number;

  constructor(maxSize = 100) {
    super();
    this.store = new Map();
    this.maxSize = maxSize;

    // Ouvir eventos para atualizar cache
    this.on('update', (key, data, duration) => {
      this.set(key, data, duration);
      // Atualizar também no Edge Config
      if (edgeConfig) {
        edgeConfig.setEdgeConfig(key, data, { ttl: duration / 1000 }).catch(console.error);
      }
    });
  }

  async get(key: string): Promise<any> {
    // Primeiro tentar o cache local
    const cached = this.store.get(key);
    if (cached && Date.now() <= cached.expiry) {
      return cached.data;
    }
    // Tentar no Edge Config
    try {
      if (edgeConfig) {
        const edgeData = await edgeConfig.getEdgeConfig(key);
        if (edgeData) {
          // Atualizar cache local se o Edge Config estiver disponível
          this.set(key, edgeData, CACHE_TIMES.SHEET_VALUES);
          return edgeData;
        }
      }
    } catch (error) {
      console.error(`Erro ao obter do Edge Config para a chave ${key}:`, error);
    }
    return null;
  }

  set(key: string, data: any, duration: number): void {
    if (this.store.size >= this.maxSize) {
      const oldestKey = this.getOldestKey();
      if (oldestKey) {
        this.store.delete(oldestKey);
      }
    }
    this.store.set(key, {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + duration,
    });

    // Definir no Edge Config para cache distribuído
    if (edgeConfig) {
      edgeConfig.setEdgeConfig(key, data, { ttl: duration / 1000 }).catch(console.error);
    }
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  async updateCache(key: string, fetchFunction: () => Promise<any>, duration: number): Promise<void> {
    try {
      const data = await fetchFunction();
      this.emit('update', key, data, duration);
    } catch (error) {
      console.error(`Erro ao atualizar cache para a chave ${key}:`, error);
    }
  }

  private getOldestKey(): string | undefined {
    let oldestKey: string | undefined = undefined;
    let oldestTimestamp = Infinity;

    for (const [key, value] of this.store.entries()) {
      if (value.timestamp < oldestTimestamp) {
        oldestTimestamp = value.timestamp;
        oldestKey = key;
      }
    }

    return oldestKey;
  }
}

export const cache = new Cache();

// Constantes de tempo de cache (em milissegundos)
export const CACHE_TIMES = {
  USERS: 30 * 60 * 1000,
  PERFORMANCE: 5 * 60 * 1000,
  METADATA: 60 * 60 * 1000,
  SHEET_VALUES: 2 * 60 * 1000,
};
