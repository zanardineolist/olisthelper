// utils/cache.ts

import EventEmitter from 'events';

// Define um mapeamento para armazenar frequências de edições por aba para ajustar o tempo de expiração
const cacheFrequencyMap = new Map<string, number>();

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
    });
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

  update(key: string, data: any): void {
    const frequency = cacheFrequencyMap.get(key) || 1;
    const dynamicDuration = CACHE_TIMES.USERS / frequency;
    this.set(key, data, dynamicDuration);
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

  clearExpired(): void {
    for (const [key, value] of this.store.entries()) {
      if (Date.now() > value.expiry) {
        this.store.delete(key);
      }
    }
  }

  // Método para forçar atualização do cache a partir de uma fonte externa (e.g., planilha Google)
  async updateCache(key: string, fetchFunction: () => Promise<any>, duration: number): Promise<void> {
    try {
      const data = await fetchFunction();
      this.emit('update', key, data, duration);
    } catch (error) {
      console.error(`Erro ao atualizar cache para a chave ${key}:`, error);
    }
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
