// utils/cache.ts
type CacheData = {
  data: any;
  timestamp: number;
  expiry: number;
};

class Cache {
  private store: Map<string, CacheData>;
  private maxSize: number;

  constructor(maxSize = 100) {  // Define um limite padrão de 100 itens
    this.store = new Map();
    this.maxSize = maxSize;
  }

  set(key: string, data: any, duration: number): void {
    if (this.store.size >= this.maxSize) {
      // Remover o item mais antigo se o cache estiver cheio
      const oldestKey = this.getOldestKey();
      if (oldestKey) {
        this.store.delete(oldestKey);
      }
    }
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

  // Retorna a chave do item mais antigo no cache
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

  // Limpar itens expirados periodicamente
  clearExpired(): void {
    for (const [key, value] of this.store.entries()) {
      if (Date.now() > value.expiry) {
        this.store.delete(key);
      }
    }
  }
}

export const cache = new Cache();

export const CACHE_TIMES = {
  USERS: 10 * 60 * 1000,        // Reduzido para 10 minutos
  PERFORMANCE: 5 * 60 * 1000,   // 5 minutos
  METADATA: 60 * 60 * 1000,     // 1 hora
  SHEET_VALUES: 2 * 60 * 1000   // 2 minutos
};