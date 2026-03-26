export interface ImageModel {
  id: string;
  object: string;
  created: number;
  input_modalities: string[];
  output_modalities: string[];
  supported_endpoints: string[];
  description?: string;
  name?: string;
  type?: string;
  paid_only?: boolean;
}

export interface VideoModel {
  id: string;
  object: string;
  created: number;
  input_modalities: string[];
  output_modalities: string[];
  supported_endpoints: string[];
  description?: string;
  name?: string;
  type?: string;
  paid_only?: boolean;
}

export interface AudioModel {
  id: string;
  object: string;
  created: number;
  input_modalities: string[];
  output_modalities: string[];
  supported_endpoints: string[];
  description?: string;
  name?: string;
  type?: string;
  voices?: string[];
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
  nologo?: boolean;
  transparent?: boolean;
  styleStrength?: number;
  guidanceScale?: number;
  steps?: number;
}

export interface HistoryItem {
  id: string;
  type: 'generate' | 'edit' | 'video' | 'audio';
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

export interface UserProfile {
  name: string;
  email: string;
  githubUsername?: string;
  image?: string;
  tier: 'anonymous' | 'microbe' | 'spore' | 'seed' | 'flower' | 'nectar' | 'router';
  createdAt: string;
  nextResetAt?: string;
}

export interface UsageRecord {
  timestamp: string;
  type: string;
  model: string;
  api_key: string;
  api_key_type: string;
  meter_source: string;
  input_text_tokens: number;
  input_cached_tokens: number;
  input_audio_tokens: number;
  input_image_tokens: number;
  output_text_tokens: number;
  output_reasoning_tokens: number;
  output_audio_tokens: number;
  output_image_tokens: number;
  cost_usd: number;
  response_time_ms: number;
}

export interface DailyUsageRecord {
  date: string;
  model: string;
  meter_source: string;
  requests: number;
  cost_usd: number;
}

export interface ApiKeyInfo {
  valid: boolean;
  type: 'publishable' | 'secret';
  name?: string;
  expiresAt?: string | null;
  expiresIn?: number | null;
  permissions?: {
    models?: string[];
    account?: string[];
  };
  pollenBudget?: number | null;
  rateLimitEnabled?: boolean;
}

/**
 * Canvas Image
 * Represents an image on the infinite canvas
 */
export interface CanvasImage {
  id: string;
  url: string;
  thumbnailUrl?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  prompt: string;
  model?: string;
  seed?: number;
  createdAt?: number;
}

/**
 * Pen Stroke
 * Represents a drawing stroke on the canvas
 */
export interface PenStroke {
  id: string;
  points: { x: number; y: number }[];
  color: string;
  imageId?: string;
}

/**
 * App Settings
 * User preferences and settings
 */
export interface AppSettings {
  themeColor: string;
  themeMode: 'light' | 'dark' | 'system';
  defaultModel?: string;
  defaultAspectRatio?: string;
  enableSafeMode?: boolean;
  enableEnhance?: boolean;
  showAdvancedSettings?: boolean;
  recentPrompts?: string[];
  favoriteStyles?: string[];
}
