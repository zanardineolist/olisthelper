// utils/cache.ts
type CacheData = {
    data: any;
    timestamp: number;
    expiry: number;
  };
  
  class Cache {
    private store: Map<string, CacheData>;
  
    constructor() {
      this.store = new Map();
    }
  
    set(key: string, data: any, duration: number): void {
      this.store.set(key, {
        data,
        timestamp: Date.now(),
        expiry: Date.now() + duration
      });
    }
  
    get(key: string): any {
      const cached = this.store.get(key);
      if (!cached) return null;
      if (Date.now() > cached.expiry) {
        this.store.delete(key);
        return null;
      }
      return cached.data;
    }
  
    delete(key: string): void {
      this.store.delete(key);
    }
  
    clear(): void {
      this.store.clear();
    }
  }
  
  export const cache = new Cache();
  
  export const CACHE_TIMES = {
    USERS: 30 * 60 * 1000,        // 30 minutos
    PERFORMANCE: 5 * 60 * 1000,   // 5 minutos
    METADATA: 60 * 60 * 1000,     // 1 hora
    SHEET_VALUES: 2 * 60 * 1000   // 2 minutos
  };
  