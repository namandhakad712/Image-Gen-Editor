/**
 * Canvas Utilities
 * 
 * Helper functions for canvas management, including proper cleanup
 * of blob URLs to prevent memory leaks.
 */

import { CanvasImage } from '@/types';

// Track created blob URLs for cleanup
const createdBlobUrls = new Set<string>();

/**
 * Create a blob URL from a fetch response
 * Also tracks the URL for later cleanup
 */
export async function createBlobUrlFromResponse(response: Response, contentType: string): Promise<string> {
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    createdBlobUrls.add(url);
    return url;
}

/**
 * Create a blob URL from a base64 string
 * Also tracks the URL for later cleanup
 */
export function createBlobUrlFromBase64(base64: string, contentType: string = 'image/jpeg'): string {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: contentType });
    const url = URL.createObjectURL(blob);
    createdBlobUrls.add(url);
    return url;
}

/**
 * Revoke a blob URL to free memory
 */
export function revokeBlobUrl(url: string): void {
    if (url && url.startsWith('blob:')) {
        try {
            URL.revokeObjectURL(url);
            createdBlobUrls.delete(url);
        } catch (e) {
            console.warn('Failed to revoke blob URL:', e);
        }
    }
}

/**
 * Revoke all tracked blob URLs
 * Call this when cleaning up the canvas
 */
export function revokeAllBlobUrls(): void {
    createdBlobUrls.forEach(url => {
        try {
            URL.revokeObjectURL(url);
        } catch (e) {
            // Ignore errors during cleanup
        }
    });
    createdBlobUrls.clear();
}

/**
 * Clean up a single canvas image
 */
export function cleanupCanvasImage(image: CanvasImage): void {
    if (image.url && image.url.startsWith('blob:')) {
        revokeBlobUrl(image.url);
    }
    if (image.thumbnailUrl && image.thumbnailUrl.startsWith('blob:')) {
        revokeBlobUrl(image.thumbnailUrl);
    }
}

/**
 * Clean up an array of canvas images
 */
export function cleanupCanvasImages(images: CanvasImage[]): void {
    images.forEach(cleanupCanvasImage);
}

/**
 * Download a file from URL
 */
export async function downloadFromUrl(url: string, filename: string): Promise<void> {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
        console.error('Download failed:', error);
        throw error;
    }
}

/**
 * Download a blob URL
 */
export function downloadBlobUrl(blobUrl: string, filename: string): void {
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Check if URL is a blob URL
 */
export function isBlobUrl(url: string): boolean {
    return url && url.startsWith('blob:');
}

/**
 * Get size of canvas in pixels (approximation)
 */
export function getCanvasSize(images: CanvasImage[]): number {
    return images.reduce((total, img) => {
        return total + (img.width * img.height);
    }, 0);
}

/**
 * Estimate memory usage of canvas images (in bytes)
 * Assumes 4 bytes per pixel (RGBA)
 */
export function estimateMemoryUsage(images: CanvasImage[]): number {
    const pixels = getCanvasSize(images);
    return pixels * 4; // 4 bytes per pixel for RGBA
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Check if canvas has too many images (performance concern)
 */
export function hasTooManyImages(images: CanvasImage[], maxImages: number = 50): boolean {
    return images.length > maxImages;
}

/**
 * Get images that should be removed to optimize performance
 * Returns oldest images first
 */
export function getImagesToRemove(images: CanvasImage[], maxImages: number): CanvasImage[] {
    if (images.length <= maxImages) return [];
    return images.slice(0, images.length - maxImages);
}

// Export all utilities
export default {
    createBlobUrlFromResponse,
    createBlobUrlFromBase64,
    revokeBlobUrl,
    revokeAllBlobUrls,
    cleanupCanvasImage,
    cleanupCanvasImages,
    downloadFromUrl,
    downloadBlobUrl,
    isBlobUrl,
    getCanvasSize,
    estimateMemoryUsage,
    formatBytes,
    hasTooManyImages,
    getImagesToRemove,
};
