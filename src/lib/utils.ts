import { HistoryItem } from '@/types';

const STORAGE_KEYS = {
  API_KEY: 'pollinations_api_key',
  HISTORY: 'pollinations_history',
  SETTINGS: 'pollinations_settings',
  CACHE: 'pollinations_cache',
  IMAGES_DB: 'pollinations_images',
};

// In-memory cache for super-fast access
const cache: Record<string, unknown> = {};
const cacheTimestamps: Record<string, number> = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes TTL

// Compress history item to minimal size
const compressHistoryItem = (item: HistoryItem): any => ({
  id: item.id,
  t: item.type, // type
  p: item.prompt, // prompt
  m: item.model, // model
  u: item.imageUrl, // imageUrl
  c: item.createdAt, // createdAt
  // Only include essential params
  params: {
    w: item.params?.width,
    h: item.params?.height,
    s: item.params?.seed,
  }
});

// Decompress history item
const decompressHistoryItem = (compressed: any): HistoryItem => ({
  id: compressed.id,
  type: compressed.t,
  prompt: compressed.p,
  model: compressed.m,
  imageUrl: compressed.u,
  createdAt: compressed.c,
  params: {
    width: compressed.params?.w || 1024,
    height: compressed.params?.h || 1024,
    seed: compressed.params?.s || 0,
    enhance: false,
    safe: false,
    model: compressed.m,
    prompt: compressed.p,
  },
  referenceImage: compressed.r,
});

// Compress data using simple deduplication
const compress = (data: unknown): string => {
  return JSON.stringify(data);
};

// Decompress data
const decompress = <T>(data: string): T => {
  return JSON.parse(data);
};

// Safe localStorage set with quota handling
const safeSetLocalStorage = (key: string, value: string): boolean => {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    // Quota exceeded - clean up old data
    console.warn('LocalStorage quota exceeded, cleaning up...');
    try {
      // Remove oldest history items
      const historyData = localStorage.getItem(STORAGE_KEYS.HISTORY);
      if (historyData) {
        const history = JSON.parse(historyData);
        const trimmed = history.slice(0, 20); // Keep only last 20 items
        localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(trimmed));
      }
      // Try again
      localStorage.setItem(key, value);
      return true;
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
      return false;
    }
  }
};

export const storage = {
  // API Key (with cache)
  getApiKey(): string | null {
    if (typeof window === 'undefined') return null;
    if (cache[STORAGE_KEYS.API_KEY] !== undefined) {
      return cache[STORAGE_KEYS.API_KEY] as string;
    }
    const key = localStorage.getItem(STORAGE_KEYS.API_KEY);
    cache[STORAGE_KEYS.API_KEY] = key;
    return key;
  },

  setApiKey(key: string): void {
    if (typeof window === 'undefined') return;
    cache[STORAGE_KEYS.API_KEY] = key;
    localStorage.setItem(STORAGE_KEYS.API_KEY, key);
  },

  removeApiKey(): void {
    if (typeof window === 'undefined') return;
    delete cache[STORAGE_KEYS.API_KEY];
    localStorage.removeItem(STORAGE_KEYS.API_KEY);
  },

  // History (with compression and cache)
  getHistory(): HistoryItem[] {
    if (typeof window === 'undefined') return [];

    // Check cache first
    const cached = cache[STORAGE_KEYS.HISTORY] as HistoryItem[] | undefined;
    if (cached) return cached;

    const data = localStorage.getItem(STORAGE_KEYS.HISTORY);
    if (!data) return [];

    try {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        const history = parsed.map(decompressHistoryItem);
        cache[STORAGE_KEYS.HISTORY] = history;
        return history;
      }
      return [];
    } catch {
      return [];
    }
  },

  setHistory(items: HistoryItem[]): void {
    if (typeof window === 'undefined') return;
    cache[STORAGE_KEYS.HISTORY] = items;
    // Compress history before saving
    const compressed = items.map(compressHistoryItem);
    safeSetLocalStorage(STORAGE_KEYS.HISTORY, JSON.stringify(compressed));
  },

  addToHistory(item: HistoryItem): void {
    const history = this.getHistory();
    history.unshift(item);
    // Keep only last 30 items to prevent quota issues
    this.setHistory(history.slice(0, 30));
  },

  removeFromHistory(id: string): void {
    const history = this.getHistory();
    this.setHistory(history.filter(item => item.id !== id));
  },

  clearHistory(): void {
    if (typeof window === 'undefined') return;
    delete cache[STORAGE_KEYS.HISTORY];
    localStorage.removeItem(STORAGE_KEYS.HISTORY);
  },

  // Settings (with cache)
  getSettings(): Record<string, unknown> {
    if (typeof window === 'undefined') return {};
    const cached = cache[STORAGE_KEYS.SETTINGS] as Record<string, unknown> | undefined;
    if (cached) return cached;

    const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!data) return {};

    try {
      const parsed = decompress<Record<string, unknown>>(data);
      cache[STORAGE_KEYS.SETTINGS] = parsed;
      return parsed;
    } catch {
      return {};
    }
  },

  setSettings(settings: Record<string, unknown>): void {
    if (typeof window === 'undefined') return;
    cache[STORAGE_KEYS.SETTINGS] = settings;
    safeSetLocalStorage(STORAGE_KEYS.SETTINGS, compress(settings));
  },

  // Generic cache with TTL
  getCached<T>(key: string): T | null {
    const cached = cache[key];
    const timestamp = cacheTimestamps[key];

    if (!cached || !timestamp) return null;
    if (Date.now() - timestamp > CACHE_TTL) {
      delete cache[key];
      delete cacheTimestamps[key];
      return null;
    }

    return cached as T;
  },

  setCached<T>(key: string, value: T): void {
    cache[key] = value;
    cacheTimestamps[key] = Date.now();
  },

  // Batch operations for performance
  batchSet(items: { key: string; value: unknown }[]): void {
    if (typeof window === 'undefined') return;
    items.forEach(({ key, value }) => {
      cache[key] = value;
      safeSetLocalStorage(key, typeof value === 'object' ? compress(value) : String(value));
    });
  },

  batchGet(keys: string[]): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    keys.forEach(key => {
      if (cache[key] !== undefined) {
        result[key] = cache[key];
      } else if (typeof window !== 'undefined') {
        const data = localStorage.getItem(key);
        if (data) {
          try {
            result[key] = decompress(data);
          } catch {
            result[key] = data;
          }
          cache[key] = result[key];
        }
      }
    });
    return result;
  },
};

// Debounce function for rate-limiting expensive operations
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Throttle function for limiting execution rate
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp));
}

// Optimized image URL caching
const urlCache = new Map<string, { url: string; timestamp: number }>();
const URL_CACHE_TTL = 30 * 60 * 1000; // 30 minutes for URLs

export const urlCacheUtil = {
  get(key: string): string | null {
    const cached = urlCache.get(key);
    if (!cached) return null;
    if (Date.now() - cached.timestamp > URL_CACHE_TTL) {
      urlCache.delete(key);
      return null;
    }
    return cached.url;
  },
  set(key: string, url: string): void {
    urlCache.set(key, { url, timestamp: Date.now() });
  },
  clear(): void {
    urlCache.clear();
  },
};

// =============================================
// IndexedDB for persistent image storage
// =============================================
const DB_NAME = 'pollinations_images_db';
const DB_VERSION = 1;
const STORE_NAME = 'images';

let dbInstance: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('Failed to open IndexedDB:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
  });
}

export const imageStorage = {
  async saveImage(item: HistoryItem): Promise<boolean> {
    try {
      const db = await openDB();
      return new Promise((resolve) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put({
          id: item.id,
          imageUrl: item.imageUrl,
          prompt: item.prompt,
          model: item.model,
          createdAt: item.createdAt,
          params: item.params,
          type: item.type,
          referenceImage: item.referenceImage,
        });

        request.onsuccess = () => resolve(true);
        request.onerror = () => {
          console.error('Failed to save image to IndexedDB:', request.error);
          resolve(false);
        };
      });
    } catch (error) {
      console.error('Error saving image:', error);
      return false;
    }
  },

  async getImage(id: string): Promise<HistoryItem | null> {
    try {
      const db = await openDB();
      return new Promise((resolve) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(id);

        request.onsuccess = () => {
          if (request.result) {
            resolve(request.result as HistoryItem);
          } else {
            resolve(null);
          }
        };
        request.onerror = () => resolve(null);
      });
    } catch (error) {
      console.error('Error getting image:', error);
      return null;
    }
  },

  async getAllImages(): Promise<HistoryItem[]> {
    try {
      const db = await openDB();
      return new Promise((resolve) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const index = store.index('createdAt');
        const request = index.openCursor(null, 'prev'); // Most recent first

        const items: HistoryItem[] = [];

        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            items.push(cursor.value as HistoryItem);
            cursor.continue();
          } else {
            resolve(items);
          }
        };

        request.onerror = () => resolve([]);
      });
    } catch (error) {
      console.error('Error getting all images:', error);
      return [];
    }
  },

  async deleteImage(id: string): Promise<boolean> {
    try {
      const db = await openDB();
      return new Promise((resolve) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);

        request.onsuccess = () => resolve(true);
        request.onerror = () => resolve(false);
      });
    } catch (error) {
      console.error('Error deleting image:', error);
      return false;
    }
  },

  async clearAllImages(): Promise<boolean> {
    try {
      const db = await openDB();
      return new Promise((resolve) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();

        request.onsuccess = () => resolve(true);
        request.onerror = () => resolve(false);
      });
    } catch (error) {
      console.error('Error clearing images:', error);
      return false;
    }
  },

  async getStorageEstimate(): Promise<{ usage: number; quota: number }> {
    try {
      if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        return {
          usage: estimate.usage || 0,
          quota: estimate.quota || 0,
        };
      }
      return { usage: 0, quota: 0 };
    } catch {
      return { usage: 0, quota: 0 };
    }
  },
};
