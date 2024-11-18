// utils/cache.ts

type CacheData = {
  data: any;
  timestamp: number;
  expiry: number;
};

class Cache {
  private store: Map<string, CacheData>;
  private maxSize: number;

  constructor(maxSize = 100) {
    this.store = new Map();
    this.maxSize = maxSize;
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
    if (this.store.has(key)) {
      this.store.set(key, {
        data,
        timestamp: Date.now(),
        expiry: this.store.get(key)!.expiry,
      });
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
  USERS: 30 * 60 * 1000,
  PERFORMANCE: 5 * 60 * 1000,
  METADATA: 60 * 60 * 1000,
  SHEET_VALUES: 2 * 60 * 1000,
};
