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
    const { model, prompt, image, seed, enhance, safe, negativePrompt, nologo, transparent } = params;

    // Use OpenAI-compatible endpoint for image editing
    const response = await fetch(`${BASE_URL}/v1/images/edits`, {
      method: 'POST',
      headers: {
        ...this.getHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        image,
        model: model || 'flux',
        seed,
        enhance,
        safe,
        negative_prompt: negativePrompt,
        nologo,
        transparent,
      }),
    });

    if (!response.ok) {
      const errorData: ApiError = await response.json().catch(() => ({
        status: response.status,
        success: false,
        error: {
          code: 'EDIT_ERROR',
          message: 'Failed to edit image',
        },
      }));
      throw new Error(errorData.error.message);
    }

    const data = await response.json();
    return data.data?.[0]?.url || data.data?.[0]?.b64_json || '';
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
    return data.data?.[0]?.url || data.data?.[0]?.b64_json || '';
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
