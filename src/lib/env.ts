/**
 * Environment Configuration
 * Centralized environment variable access with validation and defaults
 */

export const env = {
  // API Configuration
  apiUrl: process.env.NEXT_PUBLIC_POLLINATIONS_API_URL || 'https://gen.pollinations.ai',
  mediaUrl: process.env.NEXT_PUBLIC_POLLINATIONS_MEDIA_URL || 'https://media.pollinations.ai',
  
  // Feature Flags
  debugMode: process.env.NEXT_PUBLIC_DEBUG_MODE === 'true',
  analyticsEnabled: process.env.NEXT_PUBLIC_VERCEL_ANALYTICS_ENABLED !== 'false',
  
  // Rate Limiting
  rateLimitRequests: parseInt(process.env.NEXT_PUBLIC_RATE_LIMIT_REQUESTS || '60', 10),
  
  // Cache Configuration
  cacheTTL: parseInt(process.env.NEXT_PUBLIC_CACHE_TTL || '300000', 10), // 5 minutes
  
  // Storage Limits
  maxHistoryItems: parseInt(process.env.NEXT_PUBLIC_MAX_HISTORY_ITEMS || '30', 10),
  maxBatchSize: parseInt(process.env.NEXT_PUBLIC_MAX_BATCH_SIZE || '10', 10),
  maxReferenceImages: parseInt(process.env.NEXT_PUBLIC_MAX_REFERENCE_IMAGES || '4', 10),
  
  // Application
  appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  
  // External Services
  sentryDsn: process.env.NEXT_PUBLIC_SENTRY_DSN || undefined,
  postHogKey: process.env.NEXT_PUBLIC_POSTHOG_KEY || undefined,
} as const;

/**
 * Validate required environment variables
 * Call this during application initialization
 */
export function validateEnv(): void {
  const errors: string[] = [];
  
  // Validate API URL format
  try {
    new URL(env.apiUrl);
  } catch {
    errors.push('NEXT_PUBLIC_POLLINATIONS_API_URL must be a valid URL');
  }
  
  // Validate media URL format
  try {
    new URL(env.mediaUrl);
  } catch {
    errors.push('NEXT_PUBLIC_POLLINATIONS_MEDIA_URL must be a valid URL');
  }
  
  // Validate numeric values
  if (env.rateLimitRequests < 1 || env.rateLimitRequests > 1000) {
    errors.push('NEXT_PUBLIC_RATE_LIMIT_REQUESTS must be between 1 and 1000');
  }
  
  if (env.maxHistoryItems < 1 || env.maxHistoryItems > 1000) {
    errors.push('NEXT_PUBLIC_MAX_HISTORY_ITEMS must be between 1 and 1000');
  }
  
  if (env.maxBatchSize < 1 || env.maxBatchSize > 50) {
    errors.push('NEXT_PUBLIC_MAX_BATCH_SIZE must be between 1 and 50');
  }
  
  if (env.maxReferenceImages < 1 || env.maxReferenceImages > 10) {
    errors.push('NEXT_PUBLIC_MAX_REFERENCE_IMAGES must be between 1 and 10');
  }
  
  if (errors.length > 0) {
    console.error('Environment validation errors:', errors);
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Environment validation failed: ${errors.join(', ')}`);
    }
  }
  
  if (env.debugMode) {
    console.log('[ENV] Configuration loaded:', env);
  }
}

/**
 * Log environment configuration (development only)
 */
export function logEnvConfig(): void {
  if (env.debugMode && typeof window !== 'undefined') {
    console.group('[ENV] Configuration');
    console.log('API URL:', env.apiUrl);
    console.log('Media URL:', env.mediaUrl);
    console.log('Debug Mode:', env.debugMode);
    console.log('Rate Limit:', env.rateLimitRequests, 'req/min');
    console.log('Cache TTL:', env.cacheTTL, 'ms');
    console.log('Max History:', env.maxHistoryItems, 'items');
    console.log('Max Batch:', env.maxBatchSize, 'images');
    console.log('Max Reference Images:', env.maxReferenceImages);
    console.groupEnd();
  }
}
