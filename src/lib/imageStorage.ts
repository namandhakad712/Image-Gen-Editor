'use client';

/**
 * Robust IndexedDB Storage for persistent image storage
 * Provides much larger storage capacity than localStorage (hundreds of MBs vs 5MBs)
 * and better performance for binary data like images
 * 
 * Key features:
 * - Instant persistence as soon as image is generated
 * - Stores actual image blobs for offline access
 * - Automatic fallback to URL if blob storage fails
 * - Robust error handling and recovery
 */

import { HistoryItem, CanvasImage } from '@/types';

const DB_NAME = 'pollinations_images_v2';
const DB_VERSION = 2;
const STORE_NAME = 'generated_images';

// Initialize IndexedDB
let db: IDBDatabase | null = null;
let dbInitPromise: Promise<boolean> | null = null;

// Type for stored image data
interface StoredImage {
    id: string;
    imageUrl: string;
    prompt: string;
    model: string;
    createdAt: number;
    params: any;
    type: string;
    referenceImage?: string;
    // Blob storage
    blob?: Blob;
    blobType?: string;
    storedAt: number;
}

// =============================================
// DATABASE INITIALIZATION
// =============================================

async function initDB(): Promise<boolean> {
    // If already initialized, return immediately
    if (db) return true;

    // If initialization in progress, wait for it
    if (dbInitPromise) return dbInitPromise;

    dbInitPromise = new Promise((resolve) => {
        // Check if we're in a browser environment
        if (typeof window === 'undefined' || typeof indexedDB === 'undefined') {
            console.warn('IndexedDB not available');
            resolve(false);
            return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            console.error('❌ Failed to open IndexedDB:', request.error);
            dbInitPromise = null;
            resolve(false);
        };

        request.onsuccess = () => {
            db = request.result;
            console.log('✅ IndexedDB initialized successfully');

            // Handle version upgrades
            db.onversionchange = () => {
                console.log('IndexedDB version change detected, closing...');
                db?.close();
                db = null;
                dbInitPromise = null;
            };

            resolve(true);
        };

        request.onupgradeneeded = (event) => {
            const database = (event.target as IDBOpenDBRequest).result;
            console.log('📦 IndexedDB upgrade needed, version:', database.version);

            // Create object store for generated images if it doesn't exist
            if (!database.objectStoreNames.contains(STORE_NAME)) {
                const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
                store.createIndex('createdAt', 'createdAt', { unique: false });
                store.createIndex('storedAt', 'storedAt', { unique: false });
                console.log('✅ Created object store:', STORE_NAME);
            }

            // Create object store for canvas positions if it doesn't exist
            if (!database.objectStoreNames.contains('canvas_positions')) {
                const posStore = database.createObjectStore('canvas_positions', { keyPath: 'id' });
                console.log('✅ Created object store: canvas_positions');
            }
        };
    });

    return dbInitPromise;
}

// =============================================
// IMAGE STORAGE OPERATIONS
// =============================================

export const imageDB = {
    /**
     * Initialize the IndexedDB database
     */
    async init(): Promise<boolean> {
        return initDB();
    },

    /**
     * Save an image to IndexedDB
     * First tries to store as blob, falls back to URL-only if that fails
     * This is the main method that ensures instant persistence
     */
    async saveImage(item: HistoryItem): Promise<boolean> {
        // Ensure DB is initialized
        const initialized = await initDB();
        if (!initialized || !db) {
            console.error('IndexedDB not available, cannot save image');
            return false;
        }

        const startTime = Date.now();

        return new Promise(async (resolve) => {
            try {
                // Try to fetch and store the actual image blob
                let blob: Blob | null = null;
                let blobType: string | undefined;

                try {
                    const response = await fetch(item.imageUrl, {
                        mode: 'cors',
                        cache: 'force-cache' // Try to use cache
                    });

                    if (response.ok) {
                        blob = await response.blob();
                        blobType = blob.type;
                        console.log('📦 Fetched image blob:', blob.size, 'bytes');
                    } else {
                        console.warn('⚠️ Failed to fetch image for blob storage:', response.status, response.statusText);
                    }
                } catch (fetchError) {
                    console.warn('⚠️ Error fetching image for blob storage:', fetchError);
                }

                // Create stored image object
                const storedImage: StoredImage = {
                    id: item.id,
                    imageUrl: item.imageUrl, // Keep original URL as fallback
                    prompt: item.prompt,
                    model: item.model,
                    createdAt: item.createdAt,
                    params: item.params,
                    type: item.type,
                    referenceImage: item.referenceImage,
                    blob: blob || undefined,
                    blobType: blobType,
                    storedAt: Date.now(),
                };

                // Save to IndexedDB
                const tx = db.transaction(STORE_NAME, 'readwrite');
                const store = tx.objectStore(STORE_NAME);

                const putRequest = store.put(storedImage);

                tx.oncomplete = () => {
                    const duration = Date.now() - startTime;
                    console.log(`✅ Image saved to IndexedDB in ${duration}ms:`, item.id.substring(0, 8));
                    resolve(true);
                };

                tx.onerror = () => {
                    console.error('❌ Failed to save image to IndexedDB:', tx.error);
                    resolve(false);
                };

                putRequest.onerror = () => {
                    console.error('❌ Put request failed:', putRequest.error);
                };

            } catch (error) {
                console.error('❌ Error saving image to IndexedDB:', error);
                resolve(false);
            }
        });
    },

    /**
     * Save canvas image with position data
     */
    async saveCanvasImage(item: HistoryItem, x: number, y: number, width: number, height: number): Promise<boolean> {
        // First save as history item
        const saved = await this.saveImage(item);

        if (saved) {
            // Also save canvas position data
            await this.saveCanvasPosition(item.id, x, y, width, height);
        }

        return saved;
    },

    /**
     * Save canvas position data
     */
    async saveCanvasPosition(id: string, x: number, y: number, width: number, height: number): Promise<boolean> {
        const initialized = await initDB();
        if (!initialized || !db) return false;

        return new Promise((resolve) => {
            const tx = db!.transaction('canvas_positions', 'readwrite');
            const store = tx.objectStore('canvas_positions');

            store.put({ id, x, y, width, height });

            tx.oncomplete = () => resolve(true);
            tx.onerror = () => resolve(false);
        });
    },

    /**
     * Get all stored images with blob URLs created
     */
    async getAllImages(): Promise<HistoryItem[]> {
        const initialized = await initDB();
        if (!initialized || !db) return [];

        return new Promise((resolve) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const index = store.index('storedAt');
            const request = index.openCursor(null, 'prev'); // Most recent first

            const items: HistoryItem[] = [];

            request.onsuccess = (event) => {
                const cursor = (event.target as IDBRequest).result;

                if (cursor) {
                    const storedImage = cursor.value as StoredImage;

                    // Convert blob to object URL if blob exists
                    let finalUrl = storedImage.imageUrl;

                    if (storedImage.blob) {
                        try {
                            finalUrl = URL.createObjectURL(storedImage.blob);
                            console.log('🖼️ Created blob URL for:', storedImage.id.substring(0, 8));
                        } catch (e) {
                            console.error('Error creating blob URL:', e);
                        }
                    }

                    items.push({
                        id: storedImage.id,
                        imageUrl: finalUrl,
                        prompt: storedImage.prompt,
                        model: storedImage.model,
                        createdAt: storedImage.createdAt,
                        params: storedImage.params,
                        type: storedImage.type as 'generate' | 'edit' | 'video' | 'audio',
                        referenceImage: storedImage.referenceImage,
                    });

                    cursor.continue();
                } else {
                    console.log('📋 Retrieved', items.length, 'images from IndexedDB');
                    resolve(items);
                }
            };

            request.onerror = () => {
                console.error('❌ Failed to get images from IndexedDB:', request.error);
                resolve([]);
            };
        });
    },

    /**
     * Get all canvas images with positions
     */
    async getAllCanvasImages(): Promise<CanvasImage[]> {
        const historyItems = await this.getAllImages();

        // Get canvas positions
        const initialized = await initDB();
        if (!initialized || !db) {
            return historyItems.map(item => ({
                id: item.id,
                url: item.imageUrl,
                x: 100,
                y: 100,
                width: item.params?.width || 1024,
                height: item.params?.height || 1024,
                prompt: item.prompt,
                model: item.model,
                createdAt: item.createdAt,
            }));
        }

        return new Promise((resolve) => {
            const tx = db.transaction('canvas_positions', 'readonly');
            const store = tx.objectStore('canvas_positions');
            const request = store.getAll();

            request.onsuccess = () => {
                const positions: Record<string, { x: number; y: number; width: number; height: number }> = {};

                if (request.result) {
                    request.result.forEach((pos: { id: string; x: number; y: number; width: number; height: number }) => {
                        positions[pos.id] = pos;
                    });
                }

                const canvasImages = historyItems.map((item, index) => {
                    const pos = positions[item.id];
                    return {
                        id: item.id,
                        url: item.imageUrl,
                        x: pos.x ?? (100 + (index % 5) * 50),
                        y: pos.y ?? (100 + Math.floor(index / 5) * 50),
                        width: pos.width ?? item.params?.width ?? 1024,
                        height: pos.height ?? item.params?.height ?? 1024,
                        prompt: item.prompt,
                        model: item.model,
                        seed: item.params?.seed,
                        createdAt: item.createdAt,
                    };
                });

                resolve(canvasImages);
            };

            request.onerror = () => {
                resolve(historyItems.map((item, index) => ({
                    id: item.id,
                    url: item.imageUrl,
                    x: 100 + (index % 5) * 50,
                    y: 100 + Math.floor(index / 5) * 50,
                    width: item.params?.width || 1024,
                    height: item.params?.height || 1024,
                    prompt: item.prompt,
                    model: item.model,
                    createdAt: item.createdAt,
                })));
            };
        });
    },

    /**
     * Get a single image by ID
     */
    async getImage(id: string): Promise<HistoryItem | null> {
        const initialized = await initDB();
        if (!initialized || !db) return null;

        return new Promise((resolve) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const request = store.get(id);

            request.onsuccess = () => {
                const storedImage = request.result as StoredImage | undefined;

                if (!storedImage) {
                    resolve(null);
                    return;
                }

                // Convert blob to object URL if exists
                let finalUrl = storedImage.imageUrl;

                if (storedImage.blob) {
                    try {
                        finalUrl = URL.createObjectURL(storedImage.blob);
                    } catch (e) {
                        console.error('Error creating blob URL:', e);
                    }
                }

                resolve({
                    id: storedImage.id,
                    imageUrl: finalUrl,
                    prompt: storedImage.prompt,
                    model: storedImage.model,
                    createdAt: storedImage.createdAt,
                    params: storedImage.params,
                    type: storedImage.type as 'generate' | 'edit' | 'video' | 'audio',
                    referenceImage: storedImage.referenceImage,
                });
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
        const initialized = await initDB();
        if (!initialized || !db) return false;

        return new Promise((resolve) => {
            const tx = db.transaction([STORE_NAME, 'canvas_positions'], 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const posStore = tx.objectStore('canvas_positions');

            store.delete(id);
            posStore.delete(id);

            tx.oncomplete = () => {
                console.log('✅ Image deleted from IndexedDB:', id.substring(0, 8));
                resolve(true);
            };

            tx.onerror = () => {
                console.error('Failed to delete image from IndexedDB:', tx.error);
                resolve(false);
            };
        });
    },

    /**
     * Clear all images
     */
    async clearAll(): Promise<boolean> {
        const initialized = await initDB();
        if (!initialized || !db) return false;

        return new Promise((resolve) => {
            const tx = db.transaction([STORE_NAME, 'canvas_positions'], 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const posStore = tx.objectStore('canvas_positions');

            store.clear();
            posStore.clear();

            tx.oncomplete = () => {
                console.log('✅ All images cleared from IndexedDB');
                resolve(true);
            };

            tx.onerror = () => {
                console.error('Failed to clear IndexedDB:', tx.error);
                resolve(false);
            };
        });
    },

    /**
     * Check if an image exists in storage
     */
    async hasImage(id: string): Promise<boolean> {
        const initialized = await initDB();
        if (!initialized || !db) return false;

        return new Promise((resolve) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const request = store.get(id);

            request.onsuccess = () => {
                resolve(!!request.result);
            };

            request.onerror = () => {
                resolve(false);
            };
        });
    },

    /**
     * Get storage usage estimate
     */
    async getStorageUsage(): Promise<{ usage: number; quota: number }> {
        if (typeof navigator !== 'undefined' && 'storage' in navigator && 'estimate' in navigator.storage) {
            try {
                const estimate = await navigator.storage.estimate();
                return {
                    usage: estimate.usage || 0,
                    quota: estimate.quota || 0,
                };
            } catch (e) {
                console.error('Error getting storage estimate:', e);
            }
        }
        return { usage: 0, quota: 0 };
    },

    /**
     * Check if IndexedDB is available
     */
    async isAvailable(): Promise<boolean> {
        if (typeof window === 'undefined' || typeof indexedDB === 'undefined') {
            return false;
        }
        return initDB();
    },
};

// =============================================
// CONVENIENCE FUNCTIONS
// =============================================

/**
 * Save an image immediately when generated
 * This is the key function that ensures images are never lost
 */
export async function saveImageInstant(item: HistoryItem): Promise<boolean> {
    console.log('💾 Saving image to IndexedDB:', item.id.substring(0, 8));
    return imageDB.saveImage(item);
}

/**
 * Load all images from IndexedDB on app start
 */
export async function loadImagesFromStorage(): Promise<HistoryItem[]> {
    console.log('📥 Loading images from IndexedDB...');
    const images = await imageDB.getAllImages();
    console.log(`📥 Loaded ${images.length} images from IndexedDB`);
    return images;
}

/**
 * Load canvas images with positions
 */
export async function loadCanvasImages(): Promise<CanvasImage[]> {
    console.log('📥 Loading canvas images from IndexedDB...');
    const images = await imageDB.getAllCanvasImages();
    console.log(`📥 Loaded ${images.length} canvas images`);
    return images;
}

// Alias for backwards compatibility
export const loadCanvasImagesFromStorage = loadCanvasImages;

/**
 * Delete image from storage
 */
export async function deleteImageFromStorage(id: string): Promise<boolean> {
    return imageDB.deleteImage(id);
}

/**
 * Clear all images from storage
 */
export async function clearAllImagesFromStorage(): Promise<boolean> {
    return imageDB.clearAll();
}

export default imageDB;
