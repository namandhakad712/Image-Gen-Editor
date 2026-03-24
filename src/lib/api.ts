import { ImageModel, TextModel, GenerationParams, ApiError } from '@/types';

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

  async generateImage(params: GenerationParams): Promise<string> {
    const { model, prompt, negativePrompt, width, height, seed, enhance, safe, quality, image } = params;

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

  async editImage(params: GenerationParams & { image: string }): Promise<string> {
    const { model, prompt, image, seed, enhance, safe } = params;

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
}

export const pollinationsAPI = new PollinationsAPI(null);
