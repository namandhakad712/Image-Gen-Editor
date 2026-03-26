import { ImageModel, TextModel, GenerationParams, ApiError, VideoModel, AudioModel, UserProfile, UsageRecord, DailyUsageRecord, ApiKeyInfo } from '@/types';

const BASE_URL = 'https://gen.pollinations.ai';

export class PollinationsAPI {
  private apiKey: string | null;

  constructor(apiKey: string | null) {
    this.apiKey = apiKey;
  }

  setApiKey(apiKey: string | null) {
    this.apiKey = apiKey;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }
    return headers;
  }

  async getImageModels(): Promise<ImageModel[]> {
    try {
      const response = await fetch(`${BASE_URL}/image/models`, {
        headers: this.getHeaders(),
      });
      if (!response.ok) {
        throw new Error('Failed to fetch image models');
      }
      return response.json();
    } catch (error) {
      console.error('Error fetching image models:', error);
      return [];
    }
  }

  async getVideoModels(): Promise<VideoModel[]> {
    try {
      const response = await fetch(`${BASE_URL}/image/models`, {
        headers: this.getHeaders(),
      });
      if (!response.ok) {
        throw new Error('Failed to fetch video models');
      }
      const data = await response.json();
      // Filter for video models
      return data.filter((m: any) => 
        m.output_modalities?.includes('video') || m.type === 'video'
      );
    } catch (error) {
      console.error('Error fetching video models:', error);
      return [];
    }
  }

  async getTextModels(): Promise<TextModel[]> {
    try {
      const response = await fetch(`${BASE_URL}/v1/models`, {
        headers: this.getHeaders(),
      });
      if (!response.ok) {
        throw new Error('Failed to fetch text models');
      }
      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Error fetching text models:', error);
      return [];
    }
  }

  async getAudioModels(): Promise<AudioModel[]> {
    try {
      const response = await fetch(`${BASE_URL}/audio/models`, {
        headers: this.getHeaders(),
      });
      if (!response.ok) {
        throw new Error('Failed to fetch audio models');
      }
      return response.json();
    } catch (error) {
      console.error('Error fetching audio models:', error);
      return [];
    }
  }

  async generateImage(params: GenerationParams): Promise<string> {
    const { model, prompt, negativePrompt, width, height, seed, enhance, safe, quality, image, nologo, transparent, styleStrength, guidanceScale, steps } = params;

    // Build URL with query parameters
    const urlParams = new URLSearchParams();
    urlParams.set('model', model);
    urlParams.set('seed', seed.toString());
    urlParams.set('width', width.toString());
    urlParams.set('height', height.toString());

    if (enhance) urlParams.set('enhance', 'true');
    if (safe) urlParams.set('safe', 'true');
    if (negativePrompt) urlParams.set('negative_prompt', negativePrompt);
    if (quality) urlParams.set('quality', quality);
    if (image) urlParams.set('image', image);
    if (nologo) urlParams.set('nologo', 'true');
    if (transparent) urlParams.set('transparent', 'true');
    if (styleStrength) urlParams.set('style_strength', styleStrength.toString());
    if (guidanceScale) urlParams.set('guidance', guidanceScale.toString());
    if (steps) urlParams.set('steps', steps.toString());

    const encodedPrompt = encodeURIComponent(prompt);
    const imageUrl = `${BASE_URL}/image/${encodedPrompt}?${urlParams.toString()}`;

    // For generation, we need to fetch the image blob
    const response = await fetch(imageUrl, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const errorData: ApiError = await response.json().catch(() => ({
        status: response.status,
        success: false,
        error: {
          code: 'GENERATION_ERROR',
          message: 'Failed to generate image',
        },
      }));
      throw new Error(errorData.error.message);
    }

    // Return the image URL directly (Pollinations returns the image)
    // For the app, we'll use the constructed URL
    return imageUrl;
  }

  async generateVideo(params: GenerationParams & { duration?: number; audio?: boolean }): Promise<string> {
    const { model, prompt, seed, duration, aspectRatio, audio, image } = params;

    const urlParams = new URLSearchParams();
    urlParams.set('model', model);
    urlParams.set('seed', seed.toString());
    
    if (duration) urlParams.set('duration', duration.toString());
    if (aspectRatio) urlParams.set('aspectRatio', aspectRatio);
    if (audio) urlParams.set('audio', 'true');
    if (image) urlParams.set('image', image);

    const encodedPrompt = encodeURIComponent(prompt);
    const videoUrl = `${BASE_URL}/video/${encodedPrompt}?${urlParams.toString()}`;

    return videoUrl;
  }

  async editImage(params: GenerationParams & { image: string }): Promise<string> {
    const { model, prompt, image, seed, enhance, safe, negativePrompt, nologo, transparent, width, height } = params;

    console.log('📸 Edit Image - Using POST /v1/images/edits with multipart');
    console.log('  Model:', model);
    console.log('  Prompt:', prompt);
    console.log('  Image URL:', image);

    // Use POST /v1/images/edits endpoint with multipart/form-data
    // This is the OpenAI-compatible image editing endpoint
    const formData = new FormData();
    formData.append('model', model || 'flux');
    formData.append('prompt', prompt);
    formData.append('image', image); // Image URL for editing
    formData.append('seed', seed.toString());
    if (enhance) formData.append('enhance', 'true');
    if (safe) formData.append('safe', 'true');
    if (negativePrompt) formData.append('negative_prompt', negativePrompt);
    if (nologo) formData.append('nologo', 'true');
    if (transparent) formData.append('transparent', 'true');
    formData.append('width', (width || 1024).toString());
    formData.append('height', (height || 1024).toString());

    try {
      const response = await fetch(`${BASE_URL}/v1/images/edits`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Edit response:', data);
      
      const responseItem = data.data?.[0];
      if (!responseItem) {
        throw new Error('No image in response');
      }

      // Case 1: Response has a URL field — fetch and return as blob
      if (responseItem.url) {
        const url = responseItem.url;
        if (url.startsWith('blob:') || url.startsWith('data:')) {
          return url;
        }
        const imgResponse = await fetch(url);
        const blob = await imgResponse.blob();
        const blobUrl = URL.createObjectURL(blob);
        console.log('✅ Edit complete (url), blob URL:', blobUrl);
        return blobUrl;
      }

      // Case 2: Response has b64_json — raw base64 string (NOT a data: URI)
      // Convert to blob URL so it can be displayed as <img src>
      if (responseItem.b64_json) {
        const b64 = responseItem.b64_json;
        // Decode base64 → binary → Blob → object URL
        const byteChars = atob(b64);
        const byteNumbers = new Uint8Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) {
          byteNumbers[i] = byteChars.charCodeAt(i);
        }
        const blob = new Blob([byteNumbers], { type: 'image/jpeg' });
        const blobUrl = URL.createObjectURL(blob);
        console.log('✅ Edit complete (b64_json), blob URL:', blobUrl);
        return blobUrl;
      }

      throw new Error('No image URL or b64_json in response');
    } catch (error) {
      console.error('Image edit error:', error);
      throw error;
    }
  }

  async uploadImage(file: File): Promise<string> {
    // Use Pollinations media storage with API key authentication
    try {
      const formData = new FormData();
      formData.append('file', file);

      const headers: HeadersInit = {};
      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const response = await fetch('https://media.pollinations.ai/upload', {
        method: 'POST',
        headers,
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Pollinations upload:', data);
        if (data.url || data.imageUrl) {
          return data.url || data.imageUrl;
        }
      } else {
        const error = await response.json().catch(() => ({}));
        console.warn('Pollinations upload error:', response.status, error);
      }
    } catch (error) {
      console.warn('Pollinations upload failed:', error);
    }

    // Fallback: For users without API key or if upload fails,
    // we need to use a different approach
    // Since Pollinations image editing via GET /image/{prompt} doesn't support base64,
    // we'll need to inform the user to use a public image URL instead
    
    throw new Error('Image upload failed. Please ensure you have an API key set in Settings, or use a public image URL.');
  }

  async generateImageOpenAI(params: {
    prompt: string;
    model: string;
    size?: string;
    quality?: string;
    seed?: number;
    nologo?: boolean;
    enhance?: boolean;
    safe?: boolean;
    negative_prompt?: string;
    transparent?: boolean;
    style_strength?: number;
    guidance?: number;
    steps?: number;
  }): Promise<string> {
    const response = await fetch(`${BASE_URL}/v1/images/generations`, {
      method: 'POST',
      headers: {
        ...this.getHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const errorData: ApiError = await response.json().catch(() => ({
        status: response.status,
        success: false,
        error: {
          code: 'GENERATION_ERROR',
          message: 'Failed to generate image',
        },
      }));
      throw new Error(errorData.error.message);
    }

    const data = await response.json();
    const item = data.data?.[0];
    if (!item) return '';

    if (item.url) {
      if (item.url.startsWith('blob:') || item.url.startsWith('data:')) {
        return item.url;
      }
      return item.url;
    }

    if (item.b64_json) {
      const b64 = item.b64_json;
      if (b64.startsWith('data:')) return b64;

      try {
        const byteChars = atob(b64);
        const byteNumbers = new Uint8Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) {
          byteNumbers[i] = byteChars.charCodeAt(i);
        }
        const blob = new Blob([byteNumbers], { type: 'image/jpeg' });
        return URL.createObjectURL(blob);
      } catch (e) {
        return `data:image/jpeg;base64,${b64}`;
      }
    }
    return '';
  }

  async checkBalance(): Promise<number | null> {
    if (!this.apiKey) return null;

    try {
      const response = await fetch(`${BASE_URL}/account/balance`, {
        headers: this.getHeaders(),
      });
      if (!response.ok) return null;
      const data = await response.json();
      return data.balance || 0;
    } catch {
      return null;
    }
  }

  async getProfile(): Promise<UserProfile | null> {
    if (!this.apiKey) return null;

    try {
      const response = await fetch(`${BASE_URL}/account/profile`, {
        headers: this.getHeaders(),
      });
      if (!response.ok) return null;
      return response.json();
    } catch {
      return null;
    }
  }

  async getUsage(limit?: number, format: 'json' | 'csv' = 'json'): Promise<UsageRecord[] | string | null> {
    if (!this.apiKey) return null;

    try {
      const params = new URLSearchParams();
      if (limit) params.set('limit', limit.toString());
      params.set('format', format);

      const response = await fetch(`${BASE_URL}/account/usage?${params}`, {
        headers: this.getHeaders(),
      });
      if (!response.ok) return null;

      if (format === 'csv') {
        return response.text();
      }
      const data = await response.json();
      return data.usage || [];
    } catch {
      return null;
    }
  }

  async getDailyUsage(days?: number, format: 'json' | 'csv' = 'json'): Promise<DailyUsageRecord[] | string | null> {
    if (!this.apiKey) return null;

    try {
      const params = new URLSearchParams();
      if (days) params.set('days', days.toString());
      params.set('format', format);

      const response = await fetch(`${BASE_URL}/account/usage/daily?${params}`, {
        headers: this.getHeaders(),
      });
      if (!response.ok) return null;

      if (format === 'csv') {
        return response.text();
      }
      const data = await response.json();
      return data.usage || [];
    } catch {
      return null;
    }
  }

  async getApiKeyInfo(): Promise<ApiKeyInfo | null> {
    if (!this.apiKey) return null;

    try {
      const response = await fetch(`${BASE_URL}/account/key`, {
        headers: this.getHeaders(),
      });
      if (!response.ok) return null;
      return response.json();
    } catch {
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
    const { model, prompt, system, temperature, seed, json, stream } = params;

    const urlParams = new URLSearchParams();
    if (model) urlParams.set('model', model);
    if (system) urlParams.set('system', system);
    if (temperature) urlParams.set('temperature', temperature.toString());
    if (seed !== undefined) urlParams.set('seed', seed.toString());
    if (json) urlParams.set('json', 'true');
    if (stream) urlParams.set('stream', 'true');

    const encodedPrompt = encodeURIComponent(prompt);
    const response = await fetch(`${BASE_URL}/text/${encodedPrompt}?${urlParams}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const errorData: ApiError = await response.json().catch(() => ({
        status: response.status,
        success: false,
        error: {
          code: 'TEXT_GENERATION_ERROR',
          message: 'Failed to generate text',
        },
      }));
      throw new Error(errorData.error.message);
    }

    return response.text();
  }

  async generateAudio(params: {
    text: string;
    voice?: string;
    model?: string;
    duration?: number;
  }): Promise<string> {
    const { text, voice, model, duration } = params;

    const urlParams = new URLSearchParams();
    if (voice) urlParams.set('voice', voice);
    if (model) urlParams.set('model', model);
    if (duration) urlParams.set('duration', duration.toString());

    const encodedText = encodeURIComponent(text);
    const audioUrl = `${BASE_URL}/audio/${encodedText}?${urlParams.toString()}`;

    return audioUrl;
  }
}

export const pollinationsAPI = new PollinationsAPI(null);
