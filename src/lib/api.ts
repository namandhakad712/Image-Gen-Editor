import { ImageModel, TextModel, GenerationParams, ApiError, VideoModel, AudioModel, UserProfile, UsageRecord, DailyUsageRecord, ApiKeyInfo } from '@/types';
import { env } from './env';

const BASE_URL = env.apiUrl;
const MEDIA_URL = env.mediaUrl;
const DEBUG = env.debugMode;

// Rate limiting state
let requestQueue: Array<() => Promise<void>> = [];
let isProcessingQueue = false;
const RATE_LIMIT_REQUESTS = env.rateLimitRequests;
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const requestTimestamps: number[] = [];

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second
const RETRY_BACKOFF = 2; // exponential backoff multiplier

// Request timeout
const REQUEST_TIMEOUT = 120000; // 2 minutes

/**
 * Logger utility for consistent debug logging
 */
const logger = {
  debug: (...args: unknown[]) => DEBUG && console.debug('[API]', ...args),
  info: (...args: unknown[]) => DEBUG && console.info('[API]', ...args),
  warn: (...args: unknown[]) => console.warn('[API]', ...args),
  error: (...args: unknown[]) => console.error('[API]', ...args),
};

/**
 * Sleep utility for retry delays
 */
const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Rate limiter using token bucket algorithm
 */
async function withRateLimit<T>(fn: () => Promise<T>): Promise<T> {
  const now = Date.now();

  // Remove old timestamps outside the window
  while (requestTimestamps.length > 0 && requestTimestamps[0] < now - RATE_LIMIT_WINDOW) {
    requestTimestamps.shift();
  }

  // If at rate limit, wait until oldest request expires
  if (requestTimestamps.length >= RATE_LIMIT_REQUESTS) {
    const waitTime = (requestTimestamps[0] + RATE_LIMIT_WINDOW) - now;
    if (waitTime > 0) {
      logger.debug('Rate limit reached, waiting', waitTime, 'ms');
      await sleep(waitTime);
      return withRateLimit(fn); // Retry after waiting
    }
  }

  // Record this request
  requestTimestamps.push(now);

  try {
    return await fn();
  } catch (error) {
    // Remove timestamp if request failed (don't count failed requests)
    requestTimestamps.pop();
    throw error;
  }
}

/**
 * Retry wrapper with exponential backoff
 */
async function withRetry<T>(fn: () => Promise<T>, operationName: string): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry on client errors (4xx) except 429
      if (error instanceof ApiErrorImpl && error.status >= 400 && error.status < 500 && error.status !== 429) {
        throw error;
      }

      if (attempt < MAX_RETRIES) {
        const delay = RETRY_DELAY * Math.pow(RETRY_BACKOFF, attempt);
        logger.warn(`${operationName} failed, retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);
        await sleep(delay);
      }
    }
  }

  throw lastError;
}

/**
 * Fetch with timeout
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout = REQUEST_TIMEOUT
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Custom API Error class for better error handling
 */
class ApiErrorImpl extends Error implements ApiError {
  status: number;
  success: false = false;
  error: {
    code: string;
    message: string;
    timestamp?: string;
    requestId?: string;
    cause?: unknown;
  };

  constructor(status: number, code: string, message: string, requestId?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.error = {
      code,
      message,
      requestId,
      timestamp: new Date().toISOString(),
    };
  }

  static fromResponse(response: Response): ApiErrorImpl {
    const requestId = response.headers.get('x-request-id') || undefined;
    return new ApiErrorImpl(
      response.status,
      `HTTP_${response.status}`,
      `Request failed with status ${response.status}`,
      requestId
    );
  }
}

/**
 * Parse API error response
 */
async function parseErrorResponse(response: Response): Promise<ApiErrorImpl> {
  try {
    const data = await response.json();
    if (data.error?.message) {
      const requestId = response.headers.get('x-request-id') || undefined;
      return new ApiErrorImpl(
        response.status,
        data.error.code || `HTTP_${response.status}`,
        data.error.message,
        requestId
      );
    }
  } catch {
    // Response is not JSON, use default error
  }
  return ApiErrorImpl.fromResponse(response);
}

/**
 * Main API Client Class
 */
export class PollinationsAPI {
  private apiKey: string | null;
  private requestCount = 0;
  private lastResetTime = Date.now();

  constructor(apiKey: string | null = null) {
    this.apiKey = apiKey;
  }

  setApiKey(apiKey: string | null) {
    this.apiKey = apiKey;
    logger.info('API key updated');
  }

  getApiKey(): string | null {
    return this.apiKey;
  }

  private getHeaders(includeAuth = true): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (includeAuth && this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    return headers;
  }

  /**
   * Generic request handler with rate limiting and retry logic
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    operationName = 'request'
  ): Promise<T> {
    return withRateLimit(async () => {
      return withRetry(async () => {
        const url = `${BASE_URL}${endpoint}`;
        const headers = {
          ...this.getHeaders(),
          ...options.headers,
        };

        logger.debug(`${operationName}: ${options.method || 'GET'} ${url}`);
        this.requestCount++;

        const response = await fetchWithTimeout(url, { ...options, headers });

        if (!response.ok) {
          const error = await parseErrorResponse(response);
          logger.error(`${operationName} failed:`, error);
          throw error;
        }

        // Handle empty responses
        const contentType = response.headers.get('content-type');
        if (!contentType || contentType.includes('text/plain')) {
          return response.text() as unknown as T;
        }

        return response.json() as Promise<T>;
      }, operationName);
    });
  }

  /**
   * Fetch with binary response (for images, audio, video)
   */
  private async requestBinary(
    endpoint: string,
    options: RequestInit = {},
    operationName = 'requestBinary'
  ): Promise<string> {
    return withRateLimit(async () => {
      const url = `${BASE_URL}${endpoint}`;
      const headers = {
        ...this.getHeaders(),
        ...options.headers,
      };

      logger.debug(`${operationName}: ${options.method || 'GET'} ${url}`);

      const response = await fetchWithTimeout(url, { ...options, headers });

      if (!response.ok) {
        const error = await parseErrorResponse(response);
        throw error;
      }

      // Return blob URL for binary data
      const blob = await response.blob();
      return URL.createObjectURL(blob);
    });
  }

  async getImageModels(): Promise<ImageModel[]> {
    try {
      const response = await this.request<any[]>(`/image/models`, {}, 'getImageModels');
      return response || [];
    } catch (error) {
      logger.error('Failed to fetch image models:', error);
      return [];
    }
  }

  async getVideoModels(): Promise<VideoModel[]> {
    try {
      const response = await this.request<VideoModel[]>(`/video/models`, {}, 'getVideoModels');
      const models = response || [];
      if (models.length > 0) return models;

      // Fallback: filter video models from the image models catalogue
      const all = await this.request<any[]>(`/image/models`, {}, 'getVideoModelsFallback');
      return (all || []).filter((m: any) =>
        m.output_modalities?.includes('video') || m.type === 'video'
      );
    } catch (error) {
      logger.error('Failed to fetch video models:', error);
      return [];
    }
  }

  async getTextModels(): Promise<TextModel[]> {
    try {
      const response = await this.request<{ data: TextModel[] }>(`/v1/models`, {}, 'getTextModels');
      return response?.data || [];
    } catch (error) {
      logger.error('Failed to fetch text models:', error);
      return [];
    }
  }

  async getAudioModels(): Promise<AudioModel[]> {
    try {
      const response = await this.request<AudioModel[]>(`/audio/models`, {}, 'getAudioModels');
      return response || [];
    } catch (error) {
      logger.error('Failed to fetch audio models:', error);
      return [];
    }
  }

  async generateImage(params: GenerationParams): Promise<string> {
    // NOTE: Per the official Pollinations API (v0.3.0), the following GET /image
    // params are no longer supported and are silently stripped server-side:
    // nologo, enhance, negative_prompt, style_strength, guidance, steps.
    const { model, prompt, width, height, seed, safe, quality, image, transparent } = params;

    // Validate required parameters
    if (!prompt?.trim()) {
      throw new ApiErrorImpl(400, 'INVALID_PARAMS', 'Prompt is required');
    }

    // Build URL with query parameters
    const urlParams = new URLSearchParams();
    urlParams.set('model', model);
    urlParams.set('seed', seed.toString());
    urlParams.set('width', width.toString());
    urlParams.set('height', height.toString());

    if (safe) urlParams.set('safe', 'true');
    if (quality) urlParams.set('quality', quality);
    if (image) urlParams.set('image', image);
    if (transparent) urlParams.set('transparent', 'true');

    const encodedPrompt = encodeURIComponent(prompt);
    const imageUrl = `${BASE_URL}/image/${encodedPrompt}?${urlParams.toString()}`;

    logger.info('Generating image:', { model, width, height, seed });

    // Fetch the image and return blob URL
    const response = await fetchWithTimeout(imageUrl, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const error = await parseErrorResponse(response);
      throw error;
    }

    return imageUrl; // Return URL directly for Pollinations
  }

  async generateVideo(params: GenerationParams & { duration?: number; audio?: boolean }): Promise<string> {
    const { model, prompt, seed, duration, aspectRatio, audio, image } = params;

    if (!prompt?.trim()) {
      throw new ApiErrorImpl(400, 'INVALID_PARAMS', 'Prompt is required');
    }

    const urlParams = new URLSearchParams();
    urlParams.set('model', model);
    urlParams.set('seed', seed.toString());

    if (duration) urlParams.set('duration', duration.toString());
    if (aspectRatio) urlParams.set('aspectRatio', aspectRatio);
    if (audio) urlParams.set('audio', 'true');
    if (image) urlParams.set('image', image);

    const encodedPrompt = encodeURIComponent(prompt);
    const videoUrl = `${BASE_URL}/video/${encodedPrompt}?${urlParams.toString()}`;

    logger.info('Generating video:', { model, duration, aspectRatio });

    return videoUrl;
  }

  async editImage(params: GenerationParams & { image: string }): Promise<string> {
    // NOTE: nologo/enhance are removed server-side (no longer supported).
    const { model, prompt, image, seed, safe, negativePrompt, transparent, width, height } = params;

    if (!prompt?.trim()) {
      throw new ApiErrorImpl(400, 'INVALID_PARAMS', 'Prompt is required');
    }

    if (!image) {
      throw new ApiErrorImpl(400, 'INVALID_PARAMS', 'Reference image is required');
    }

    logger.info('Editing image:', { model, prompt: prompt.slice(0, 50) + '...' });

    // Use POST /v1/images/edits endpoint with multipart/form-data
    const formData = new FormData();
    formData.append('model', model || 'flux');
    formData.append('prompt', prompt);
    formData.append('image', image);
    formData.append('seed', seed.toString());
    if (safe) formData.append('safe', 'true');
    if (negativePrompt) formData.append('negative_prompt', negativePrompt);
    if (transparent) formData.append('transparent', 'true');
    formData.append('width', (width || 1024).toString());
    formData.append('height', (height || 1024).toString());

    return withRateLimit(async () => {
      return withRetry(async () => {
        const headers: HeadersInit = {};
        if (this.apiKey) {
          headers['Authorization'] = `Bearer ${this.apiKey}`;
        }

        const response = await fetchWithTimeout(`${BASE_URL}/v1/images/edits`, {
          method: 'POST',
          headers, // Let browser set Content-Type for FormData (with boundary)
          body: formData,
        });

        if (!response.ok) {
          const error = await parseErrorResponse(response);
          throw error;
        }

        const data = await response.json();
        const responseItem = data.data?.[0];

        if (!responseItem) {
          throw new ApiErrorImpl(500, 'NO_RESPONSE', 'No image in response');
        }

        if (responseItem.url) {
          if (responseItem.url.startsWith('blob:') || responseItem.url.startsWith('data:')) {
            return responseItem.url;
          }
          // Fetch and convert to blob URL
          const imgResponse = await fetchWithTimeout(responseItem.url);
          const blob = await imgResponse.blob();
          return URL.createObjectURL(blob);
        }

        if (responseItem.b64_json) {
          const b64 = responseItem.b64_json;
          const byteChars = atob(b64);
          const byteNumbers = new Uint8Array(byteChars.length);
          for (let i = 0; i < byteChars.length; i++) {
            byteNumbers[i] = byteChars.charCodeAt(i);
          }
          const blob = new Blob([byteNumbers], { type: 'image/jpeg' });
          return URL.createObjectURL(blob);
        }

        throw new ApiErrorImpl(500, 'INVALID_RESPONSE', 'No image URL or b64_json in response');
      }, 'editImage');
    });
  }

  async uploadImage(file: File): Promise<string> {
    // Validate file
    if (!file.type.startsWith('image/')) {
      throw new ApiErrorImpl(400, 'INVALID_FILE_TYPE', 'Only image files are allowed');
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new ApiErrorImpl(400, 'FILE_TOO_LARGE', `File must be smaller than ${maxSize / 1024 / 1024}MB`);
    }

    try {
      const formData = new FormData();
      formData.append('file', file);

      const headers: HeadersInit = {};
      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const response = await fetchWithTimeout(`${MEDIA_URL}/upload`, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        logger.info('Upload successful:', data);
        if (data.url || data.imageUrl) {
          return data.url || data.imageUrl;
        }
      }

      const error = await parseErrorResponse(response);
      throw error;
    } catch (error) {
      logger.error('Upload failed:', error);
      throw error instanceof ApiErrorImpl
        ? error
        : new ApiErrorImpl(500, 'UPLOAD_FAILED', 'Failed to upload image');
    }
  }

  async generateImageOpenAI(params: {
    prompt: string;
    model: string;
    size?: string;
    quality?: string;
    seed?: number;
    safe?: boolean;
    negative_prompt?: string;
    transparent?: boolean;
    style_strength?: number;
    guidance?: number;
    steps?: number;
  }): Promise<string> {
    if (!params.prompt?.trim()) {
      throw new ApiErrorImpl(400, 'INVALID_PARAMS', 'Prompt is required');
    }

    // Build payload. nologo/enhance are no longer supported by the endpoint
    // and are omitted; other fields map to the OpenAI-compatible schema.
    const payload: Record<string, unknown> = {
      prompt: params.prompt,
      model: params.model,
    };
    if (params.size) payload.size = params.size;
    if (params.quality) payload.quality = params.quality;
    if (params.seed !== undefined) payload.seed = params.seed;
    if (params.safe) payload.safe = true;
    if (params.negative_prompt) payload.negative_prompt = params.negative_prompt;
    if (params.transparent) payload.transparent = true;
    if (params.style_strength !== undefined) payload.style_strength = params.style_strength;
    if (params.guidance !== undefined) payload.guidance = params.guidance;
    if (params.steps !== undefined) payload.steps = params.steps;

    return this.request<{ data: Array<{ url?: string; b64_json?: string }> }>(
      `/v1/images/generations`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      'generateImageOpenAI'
    ).then(data => {
      const item = data.data?.[0];
      if (!item) {
        throw new ApiErrorImpl(500, 'NO_RESPONSE', 'No image in response');
      }

      if (item.url) {
        return item.url;
      }

      if (item.b64_json) {
        const b64 = item.b64_json;
        if (b64.startsWith('data:')) return b64;

        const byteChars = atob(b64);
        const byteNumbers = new Uint8Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) {
          byteNumbers[i] = byteChars.charCodeAt(i);
        }
        const blob = new Blob([byteNumbers], { type: 'image/jpeg' });
        return URL.createObjectURL(blob);
      }

      throw new ApiErrorImpl(500, 'INVALID_RESPONSE', 'No image URL or b64_json in response');
    });
  }

  async checkBalance(): Promise<number | null> {
    if (!this.apiKey) return null;

    try {
      const response = await this.request<{ balance: number }>(`/account/balance`, {}, 'checkBalance');
      return response?.balance ?? null;
    } catch (error) {
      logger.error('Failed to check balance:', error);
      return null;
    }
  }

  async getProfile(): Promise<UserProfile | null> {
    if (!this.apiKey) return null;

    try {
      return await this.request<UserProfile>(`/account/profile`, {}, 'getProfile');
    } catch (error) {
      logger.error('Failed to get profile:', error);
      return null;
    }
  }

  async getUsage(limit?: number, format: 'json' | 'csv' = 'json'): Promise<UsageRecord[] | string | null> {
    if (!this.apiKey) return null;

    try {
      const params = new URLSearchParams();
      if (limit) params.set('limit', limit.toString());
      params.set('format', format);

      const endpoint = `/account/usage?${params}`;

      if (format === 'csv') {
        return this.request<string>(endpoint, {}, 'getUsageCSV');
      }

      const response = await this.request<{ usage: UsageRecord[] }>(endpoint, {}, 'getUsage');
      return response?.usage ?? [];
    } catch (error) {
      logger.error('Failed to get usage:', error);
      return null;
    }
  }

  async getDailyUsage(days?: number, format: 'json' | 'csv' = 'json'): Promise<DailyUsageRecord[] | string | null> {
    if (!this.apiKey) return null;

    try {
      const params = new URLSearchParams();
      if (days) params.set('days', days.toString());
      params.set('format', format);

      const endpoint = `/account/usage/daily?${params}`;

      if (format === 'csv') {
        return this.request<string>(endpoint, {}, 'getDailyUsageCSV');
      }

      const response = await this.request<{ usage: DailyUsageRecord[] }>(endpoint, {}, 'getDailyUsage');
      return response?.usage ?? [];
    } catch (error) {
      logger.error('Failed to get daily usage:', error);
      return null;
    }
  }

  async getApiKeyInfo(): Promise<ApiKeyInfo | null> {
    if (!this.apiKey) return null;

    try {
      return await this.request<ApiKeyInfo>(`/account/key`, {}, 'getApiKeyInfo');
    } catch (error) {
      logger.error('Failed to get API key info:', error);
      return null;
    }
  }

  async generateText(params: {
    model: string;
    prompt: string;
    system?: string;
    temperature?: number;
    seed?: number;
    json?: boolean;
    stream?: boolean;
  }): Promise<string> {
    if (!params.prompt?.trim()) {
      throw new ApiErrorImpl(400, 'INVALID_PARAMS', 'Prompt is required');
    }

    const { model, prompt, system, temperature, seed, json, stream } = params;

    const urlParams = new URLSearchParams();
    if (model) urlParams.set('model', model);
    if (system) urlParams.set('system', system);
    if (temperature) urlParams.set('temperature', temperature.toString());
    if (seed !== undefined) urlParams.set('seed', seed.toString());
    if (json) urlParams.set('json', 'true');
    if (stream) urlParams.set('stream', 'true');

    const encodedPrompt = encodeURIComponent(prompt);

    return this.request<string>(
      `/text/${encodedPrompt}?${urlParams}`,
      {},
      'generateText'
    );
  }

  async generateAudio(params: {
    text: string;
    voice?: string;
    model?: string;
    duration?: number;
  }): Promise<string> {
    if (!params.text?.trim()) {
      throw new ApiErrorImpl(400, 'INVALID_PARAMS', 'Text is required');
    }

    const { text, voice, model, duration } = params;

    const urlParams = new URLSearchParams();
    if (voice) urlParams.set('voice', voice);
    if (model) urlParams.set('model', model);
    if (duration) urlParams.set('duration', duration.toString());

    const encodedText = encodeURIComponent(text);
    const audioUrl = `${BASE_URL}/audio/${encodedText}?${urlParams.toString()}`;

    return audioUrl;
  }

  /**
   * Get request statistics
   */
  getRequestStats(): { count: number; rateLimited: boolean } {
    const now = Date.now();
    const recentRequests = requestTimestamps.filter(ts => ts > now - RATE_LIMIT_WINDOW);

    return {
      count: this.requestCount,
      rateLimited: recentRequests.length >= RATE_LIMIT_REQUESTS,
    };
  }

  /**
   * Reset request counter
   */
  resetRequestStats(): void {
    this.requestCount = 0;
    this.lastResetTime = Date.now();
    requestTimestamps.length = 0;
  }
}

// Export singleton instance
export const pollinationsAPI = new PollinationsAPI(null);
