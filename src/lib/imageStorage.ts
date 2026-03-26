'use client';

/**
 * IndexedDB Storage for persistent image storage
 * Provides much larger storage capacity than localStorage (hundreds of MBs vs 5MBs)
 * and better performance for binary data like images
 */

import { HistoryItem } from '@/types';

const DB_NAME = 'pollinations_images';
const DB_VERSION = 1;
const STORE_NAME = 'generated_images';

// Initialize IndexedDB
let db: IDBDatabase | null = null;

export const imageDB = {
    /**
     * Initialize the IndexedDB database
     */
    async init(): Promise<boolean> {
        return new Promise((resolve) => {
            if (db) {
                resolve(true);
                return;
            }

            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                console.error('Failed to open IndexedDB:', request.error);
                resolve(false);
            };

            request.onsuccess = () => {
                db = request.result;
                console.log('IndexedDB initialized successfully');
                resolve(true);
            };

            request.onupgradeneeded = (event) => {
                const database = (event.target as IDBOpenDBRequest).result;

                // Create object store if it doesn't exist
                if (!database.objectStoreNames.contains(STORE_NAME)) {
                    const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
                    store.createIndex('createdAt', 'createdAt', { unique: false });
                    store.createIndex('imageUrl', 'imageUrl', { unique: false });
                }
            };
        });
    },

    /**
     * Save an image (fetch from URL and store as blob)
     */
    async saveImage(item: HistoryItem): Promise<boolean> {
        if (!db) {
            await this.init();
        }
        if (!db) return false;

        return new Promise(async (resolve) => {
            try {
                // Fetch the image and convert to blob
                const response = await fetch(item.imageUrl);
                if (!response.ok) {
                    console.warn('Failed to fetch image for storage:', response.status);
                    // Save without blob, just store the URL
                    const tx = (db as IDBDatabase).transaction(STORE_NAME, 'readwrite');
                    const store = tx.objectStore(STORE_NAME);
                    store.put({
                        ...item,
                        blob: null,
                        storedAt: Date.now()
                    });
                    tx.oncomplete = () => resolve(true);
                    tx.onerror = () => resolve(false);
                    return;
                }

                const blob = await response.blob();

                const tx = (db as IDBDatabase).transaction(STORE_NAME, 'readwrite');
                const store = tx.objectStore(STORE_NAME);

                store.put({
                    ...item,
                    blob: blob,
                    blobType: blob.type,
                    storedAt: Date.now()
                });

                tx.oncomplete = () => {
                    console.log('Image saved to IndexedDB:', item.id);
                    resolve(true);
                };
                tx.onerror = () => {
                    console.error('Failed to save image to IndexedDB:', tx.error);
                    resolve(false);
                };
            } catch (error) {
                console.error('Error saving image to IndexedDB:', error);
                resolve(false);
            }
        });
    },

    /**
     * Get all stored images
     */
    async getAllImages(): Promise<HistoryItem[]> {
        if (!db) {
            await this.init();
        }
        if (!db) return [];

        return new Promise((resolve) => {
            const tx = (db as IDBDatabase).transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const request = store.getAll();

            request.onsuccess = () => {
                const items = request.result || [];

                // Convert blobs back to object URLs
                const processedItems = items.map((item: any) => {
                    if (item.blob) {
                        const objectUrl = URL.createObjectURL(item.blob);
                        return {
                            ...item,
                            imageUrl: objectUrl,
                            blob: undefined // Don't include blob in returned data
                        };
                    }
                    return item;
                }).sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));

                resolve(processedItems);
            };

            request.onerror = () => {
                console.error('Failed to get images from IndexedDB:', request.error);
                resolve([]);
            };
        });
    },

    /**
     * Get a single image by ID
     */
    async getImage(id: string): Promise<HistoryItem | null> {
        if (!db) {
            await this.init();
        }
        if (!db) return null;

        return new Promise((resolve) => {
            const tx = (db as IDBDatabase).transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const request = store.get(id);

            request.onsuccess = () => {
                const item = request.result;
                if (!item) {
                    resolve(null);
                    return;
                }

                if (item.blob) {
                    const objectUrl = URL.createObjectURL(item.blob);
                    resolve({
                        ...item,
                        imageUrl: objectUrl,
                        blob: undefined
                    });
                } else {
                    resolve(item);
                }
            };

            request.onerror = () => {
                console.error('Failed to get image from IndexedDB:', request.error);
                resolve(null);
            };
        });
    },

    /**
     * Delete an image by ID
     */
    async deleteImage(id: string): Promise<boolean> {
        if (!db) {
            await this.init();
        }
        if (!db) return false;

        return new Promise((resolve) => {
            const tx = (db as IDBDatabase).transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const request = store.delete(id);

            request.onsuccess = () => {
                console.log('Image deleted from IndexedDB:', id);
                resolve(true);
            };

            request.onerror = () => {
                console.error('Failed to delete image from IndexedDB:', request.error);
                resolve(false);
            };
        });
    },

    /**
     * Clear all images
     */
    async clearAll(): Promise<boolean> {
        if (!db) {
            await this.init();
        }
        if (!db) return false;

        return new Promise((resolve) => {
            const tx = (db as IDBDatabase).transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const request = store.clear();

            request.onsuccess = () => {
                console.log('All images cleared from IndexedDB');
                resolve(true);
            };

            request.onerror = () => {
                console.error('Failed to clear IndexedDB:', request.error);
                resolve(false);
            };
        });
    },

    /**
     * Get storage usage estimate
     */
    async getStorageUsage(): Promise<{ usage: number; quota: number }> {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            const estimate = await navigator.storage.estimate();
            return {
                usage: estimate.usage || 0,
                quota: estimate.quota || 0
            };
        }
        return { usage: 0, quota: 0 };
    },

    /**
     * Check if an image exists in storage
     */
    async hasImage(id: string): Promise<boolean> {
        if (!db) {
            await this.init();
        }
        if (!db) return false;

        return new Promise((resolve) => {
            const tx = (db as IDBDatabase).transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const request = store.get(id);

            request.onsuccess = () => {
                resolve(!!request.result);
            };

            request.onerror = () => {
                resolve(false);
            };
        });
    }
};
