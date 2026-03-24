import { HistoryItem } from '@/types';

const STORAGE_KEYS = {
  API_KEY: 'pollinations_api_key',
  HISTORY: 'pollinations_history',
  SETTINGS: 'pollinations_settings',
};

export const storage = {
  // API Key
  getApiKey(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(STORAGE_KEYS.API_KEY);
  },

  setApiKey(key: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.API_KEY, key);
  },

  removeApiKey(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEYS.API_KEY);
  },

  // History
  getHistory(): HistoryItem[] {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(STORAGE_KEYS.HISTORY);
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  },

  setHistory(items: HistoryItem[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(items));
  },

  addToHistory(item: HistoryItem): void {
    const history = this.getHistory();
    history.unshift(item);
    // Keep only last 50 items
    this.setHistory(history.slice(0, 50));
  },

  removeFromHistory(id: string): void {
    const history = this.getHistory();
    this.setHistory(history.filter(item => item.id !== id));
  },

  clearHistory(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEYS.HISTORY);
  },

  // Settings
  getSettings(): Record<string, unknown> {
    if (typeof window === 'undefined') return {};
    const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!data) return {};
    try {
      return JSON.parse(data);
    } catch {
      return {};
    }
  },

  setSettings(settings: Record<string, unknown>): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  },
};

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
