export interface ImageModel {
  id: string;
  object: string;
  created: number;
  input_modalities: string[];
  output_modalities: string[];
  supported_endpoints: string[];
}

export interface TextModel {
  id: string;
  object: string;
  created: number;
  input_modalities: string[];
  output_modalities: string[];
  supported_endpoints: string[];
  tools?: boolean;
  reasoning?: boolean;
  context_length?: number;
}

export interface GenerationParams {
  model: string;
  prompt: string;
  negativePrompt?: string;
  width: number;
  height: number;
  seed: number;
  enhance: boolean;
  safe: boolean;
  quality?: 'low' | 'medium' | 'high' | 'hd';
  image?: string;
  duration?: number;
  aspectRatio?: '16:9' | '9:16';
  audio?: boolean;
}

export interface HistoryItem {
  id: string;
  type: 'generate' | 'edit';
  prompt: string;
  model: string;
  imageUrl: string;
  thumbnailUrl?: string;
  params: GenerationParams;
  createdAt: number;
  referenceImage?: string;
}

export interface ApiError {
  status: number;
  success: false;
  error: {
    code: string;
    message: string;
    timestamp?: string;
    requestId?: string;
    cause?: unknown;
  };
}
