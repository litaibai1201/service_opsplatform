// Cache utilities for performance optimization

interface CacheConfig {
  maxAge?: number; // in milliseconds
  maxSize?: number; // max number of items
  keyPrefix?: string;
}

// In-memory cache with LRU eviction
class MemoryCache<T> {
  private cache = new Map<string, { value: T; timestamp: number; accessCount: number }>();
  private config: Required<CacheConfig>;
  private accessOrder: string[] = [];

  constructor(config: CacheConfig = {}) {
    this.config = {
      maxAge: config.maxAge || 5 * 60 * 1000, // 5 minutes default
      maxSize: config.maxSize || 100, // 100 items default
      keyPrefix: config.keyPrefix || 'cache_',
    };
  }

  private isExpired(timestamp: number): boolean {
    return Date.now() - timestamp > this.config.maxAge;
  }

  private updateAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(key);
  }

  private evictLRU(): void {
    if (this.accessOrder.length === 0) return;
    
    const oldestKey = this.accessOrder.shift()!;
    this.cache.delete(oldestKey);
  }

  private cleanup(): void {
    const expiredKeys: string[] = [];
    
    this.cache.forEach((item, key) => {
      if (this.isExpired(item.timestamp)) {
        expiredKeys.push(key);
      }
    });

    expiredKeys.forEach(key => {
      this.cache.delete(key);
      const index = this.accessOrder.indexOf(key);
      if (index > -1) {
        this.accessOrder.splice(index, 1);
      }
    });
  }

  get(key: string): T | null {
    this.cleanup();
    
    const fullKey = this.config.keyPrefix + key;
    const item = this.cache.get(fullKey);
    
    if (!item) return null;
    if (this.isExpired(item.timestamp)) {
      this.cache.delete(fullKey);
      return null;
    }

    item.accessCount++;
    this.updateAccessOrder(fullKey);
    return item.value;
  }

  set(key: string, value: T): void {
    this.cleanup();
    
    const fullKey = this.config.keyPrefix + key;
    
    // If cache is at max size, evict LRU item
    if (this.cache.size >= this.config.maxSize && !this.cache.has(fullKey)) {
      this.evictLRU();
    }

    this.cache.set(fullKey, {
      value,
      timestamp: Date.now(),
      accessCount: 1,
    });
    
    this.updateAccessOrder(fullKey);
  }

  delete(key: string): boolean {
    const fullKey = this.config.keyPrefix + key;
    const index = this.accessOrder.indexOf(fullKey);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    return this.cache.delete(fullKey);
  }

  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
  }

  has(key: string): boolean {
    const fullKey = this.config.keyPrefix + key;
    const item = this.cache.get(fullKey);
    return item ? !this.isExpired(item.timestamp) : false;
  }

  size(): number {
    this.cleanup();
    return this.cache.size;
  }

  getStats() {
    const items = Array.from(this.cache.entries());
    return {
      totalItems: items.length,
      totalSize: this.config.maxSize,
      oldestItem: items.length > 0 ? Math.min(...items.map(([_, item]) => item.timestamp)) : null,
      newestItem: items.length > 0 ? Math.max(...items.map(([_, item]) => item.timestamp)) : null,
      totalAccesses: items.reduce((sum, [_, item]) => sum + item.accessCount, 0),
    };
  }
}

// localStorage cache with expiration
class LocalStorageCache<T> {
  private keyPrefix: string;
  private maxAge: number;

  constructor(config: CacheConfig = {}) {
    this.keyPrefix = config.keyPrefix || 'cache_';
    this.maxAge = config.maxAge || 24 * 60 * 60 * 1000; // 24 hours default
  }

  private getFullKey(key: string): string {
    return this.keyPrefix + key;
  }

  private isExpired(timestamp: number): boolean {
    return Date.now() - timestamp > this.maxAge;
  }

  get(key: string): T | null {
    try {
      const fullKey = this.getFullKey(key);
      const item = localStorage.getItem(fullKey);
      
      if (!item) return null;
      
      const { value, timestamp } = JSON.parse(item);
      
      if (this.isExpired(timestamp)) {
        localStorage.removeItem(fullKey);
        return null;
      }
      
      return value;
    } catch (error) {
      console.error('LocalStorageCache get error:', error);
      return null;
    }
  }

  set(key: string, value: T): void {
    try {
      const fullKey = this.getFullKey(key);
      const item = {
        value,
        timestamp: Date.now(),
      };
      
      localStorage.setItem(fullKey, JSON.stringify(item));
    } catch (error) {
      console.error('LocalStorageCache set error:', error);
      
      // Try to clear some space if storage is full
      if (error instanceof DOMException && error.code === 22) {
        this.cleanup();
        try {
          localStorage.setItem(this.getFullKey(key), JSON.stringify({ value, timestamp: Date.now() }));
        } catch (secondError) {
          console.error('LocalStorageCache set error after cleanup:', secondError);
        }
      }
    }
  }

  delete(key: string): void {
    localStorage.removeItem(this.getFullKey(key));
  }

  clear(): void {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(this.keyPrefix)) {
        localStorage.removeItem(key);
      }
    });
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  cleanup(): void {
    const keys = Object.keys(localStorage);
    const expiredKeys: string[] = [];
    
    keys.forEach(key => {
      if (key.startsWith(this.keyPrefix)) {
        try {
          const item = localStorage.getItem(key);
          if (item) {
            const { timestamp } = JSON.parse(item);
            if (this.isExpired(timestamp)) {
              expiredKeys.push(key);
            }
          }
        } catch (error) {
          // Invalid JSON, remove it
          expiredKeys.push(key);
        }
      }
    });

    expiredKeys.forEach(key => localStorage.removeItem(key));
  }
}

// IndexedDB cache for large data
class IndexedDBCache<T> {
  private dbName: string;
  private storeName: string;
  private maxAge: number;
  private db: IDBDatabase | null = null;

  constructor(dbName = 'app_cache', storeName = 'cache_store', maxAge = 7 * 24 * 60 * 60 * 1000) {
    this.dbName = dbName;
    this.storeName = storeName;
    this.maxAge = maxAge;
    this.initDB();
  }

  private async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => reject(request.error);
      
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  async get(key: string): Promise<T | null> {
    if (!this.db) await this.initDB();
    if (!this.db) return null;

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(key);

      request.onsuccess = () => {
        const item = request.result;
        
        if (!item) {
          resolve(null);
          return;
        }

        if (Date.now() - item.timestamp > this.maxAge) {
          this.delete(key); // Clean up expired item
          resolve(null);
          return;
        }

        resolve(item.value);
      };

      request.onerror = () => resolve(null);
    });
  }

  async set(key: string, value: T): Promise<void> {
    if (!this.db) await this.initDB();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      const item = {
        id: key,
        value,
        timestamp: Date.now(),
      };
      
      const request = store.put(item);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async delete(key: string): Promise<void> {
    if (!this.db) await this.initDB();
    if (!this.db) return;

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => resolve(); // Don't fail on delete errors
    });
  }

  async clear(): Promise<void> {
    if (!this.db) await this.initDB();
    if (!this.db) return;

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
    });
  }

  async cleanup(): Promise<void> {
    if (!this.db) await this.initDB();
    if (!this.db) return;

    const expiredKeys: string[] = [];
    const now = Date.now();

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.openCursor();

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          if (now - cursor.value.timestamp > this.maxAge) {
            expiredKeys.push(cursor.value.id);
          }
          cursor.continue();
        } else {
          // Delete expired keys
          Promise.all(expiredKeys.map(key => this.delete(key))).then(() => resolve());
        }
      };

      request.onerror = () => resolve();
    });
  }
}

// Unified cache manager
export class CacheManager {
  private memoryCache: MemoryCache<any>;
  private localStorageCache: LocalStorageCache<any>;
  private indexedDBCache: IndexedDBCache<any>;

  constructor(config: CacheConfig = {}) {
    this.memoryCache = new MemoryCache(config);
    this.localStorageCache = new LocalStorageCache(config);
    this.indexedDBCache = new IndexedDBCache();
  }

  // Memory cache (fastest)
  memory = {
    get: <T>(key: string): T | null => this.memoryCache.get(key),
    set: <T>(key: string, value: T): void => this.memoryCache.set(key, value),
    delete: (key: string): boolean => this.memoryCache.delete(key),
    clear: (): void => this.memoryCache.clear(),
    has: (key: string): boolean => this.memoryCache.has(key),
  };

  // localStorage cache (persistent)
  local = {
    get: <T>(key: string): T | null => this.localStorageCache.get(key),
    set: <T>(key: string, value: T): void => this.localStorageCache.set(key, value),
    delete: (key: string): void => this.localStorageCache.delete(key),
    clear: (): void => this.localStorageCache.clear(),
    has: (key: string): boolean => this.localStorageCache.has(key),
    cleanup: (): void => this.localStorageCache.cleanup(),
  };

  // IndexedDB cache (for large data)
  indexed = {
    get: async <T>(key: string): Promise<T | null> => this.indexedDBCache.get(key),
    set: async <T>(key: string, value: T): Promise<void> => this.indexedDBCache.set(key, value),
    delete: async (key: string): Promise<void> => this.indexedDBCache.delete(key),
    clear: async (): Promise<void> => this.indexedDBCache.clear(),
    cleanup: async (): Promise<void> => this.indexedDBCache.cleanup(),
  };

  // Multi-tier cache (checks memory -> localStorage -> IndexedDB)
  async get<T>(key: string): Promise<T | null> {
    // Check memory cache first
    let value = this.memory.get<T>(key);
    if (value !== null) return value;

    // Check localStorage
    value = this.local.get<T>(key);
    if (value !== null) {
      // Store in memory for faster future access
      this.memory.set(key, value);
      return value;
    }

    // Check IndexedDB
    value = await this.indexed.get<T>(key);
    if (value !== null) {
      // Store in memory and localStorage for faster future access
      this.memory.set(key, value);
      this.local.set(key, value);
      return value;
    }

    return null;
  }

  async set<T>(key: string, value: T, options: { 
    persistent?: boolean; 
    large?: boolean 
  } = {}): Promise<void> {
    const { persistent = true, large = false } = options;

    // Always store in memory for immediate access
    this.memory.set(key, value);

    if (persistent) {
      if (large) {
        // Store large data in IndexedDB
        await this.indexed.set(key, value);
      } else {
        // Store regular data in localStorage
        this.local.set(key, value);
      }
    }
  }

  async delete(key: string): Promise<void> {
    this.memory.delete(key);
    this.local.delete(key);
    await this.indexed.delete(key);
  }

  async clear(): Promise<void> {
    this.memory.clear();
    this.local.clear();
    await this.indexed.clear();
  }

  async cleanup(): Promise<void> {
    this.local.cleanup();
    await this.indexed.cleanup();
  }

  getStats() {
    return {
      memory: this.memoryCache.getStats(),
      localStorage: {
        used: Object.keys(localStorage).filter(k => k.startsWith('cache_')).length,
      },
    };
  }
}

// Default cache instance
export const cache = new CacheManager();

// Cache decorator for functions
export function cached<T extends (...args: any[]) => any>(
  fn: T,
  options: {
    keyGenerator?: (...args: Parameters<T>) => string;
    ttl?: number;
    cacheType?: 'memory' | 'local' | 'indexed' | 'auto';
  } = {}
): T {
  const {
    keyGenerator = (...args) => JSON.stringify(args),
    ttl = 5 * 60 * 1000, // 5 minutes
    cacheType = 'auto',
  } = options;

  const cacheInstance = new CacheManager({ maxAge: ttl });

  return (async (...args: Parameters<T>) => {
    const cacheKey = keyGenerator(...args);
    
    // Try to get from cache
    let cached;
    if (cacheType === 'memory') {
      cached = cacheInstance.memory.get(cacheKey);
    } else if (cacheType === 'local') {
      cached = cacheInstance.local.get(cacheKey);
    } else if (cacheType === 'indexed') {
      cached = await cacheInstance.indexed.get(cacheKey);
    } else {
      cached = await cacheInstance.get(cacheKey);
    }

    if (cached !== null) {
      return cached;
    }

    // Execute function and cache result
    const result = await fn(...args);
    
    if (cacheType === 'memory') {
      cacheInstance.memory.set(cacheKey, result);
    } else if (cacheType === 'local') {
      cacheInstance.local.set(cacheKey, result);
    } else if (cacheType === 'indexed') {
      await cacheInstance.indexed.set(cacheKey, result);
    } else {
      await cacheInstance.set(cacheKey, result);
    }

    return result;
  }) as T;
}