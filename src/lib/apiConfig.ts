/**
 * API Configuration
 * 
 * Centralized API endpoints configuration to ensure consistency
 * across all components and pages.
 */

// API Base URLs
export const API_CONFIG = {
    // Main API base URL
    baseUrl: process.env.NEXT_PUBLIC_API_URL || 'https://gen.pollinations.ai',

    // Media/Image upload URL
    mediaUrl: process.env.NEXT_PUBLIC_MEDIA_URL || 'https://media.pollinations.ai',

    // Image generation endpoint (for simple generation)
    imageEndpoint: '/image',

    // Video generation endpoint
    videoEndpoint: '/video',

    // Text generation endpoint
    textEndpoint: '/text',

    // Audio generation endpoint
    audioEndpoint: '/audio',

    // Account endpoints
    account: {
        balance: '/account/balance',
        profile: '/account/profile',
        usage: '/account/usage',
        usageDaily: '/account/usage/daily',
        apiKey: '/account/key',
    },

    // Model endpoints
    models: {
        // Primary models endpoint - returns all models with their capabilities
        image: '/image/models',
        video: '/image/models', // Video models are filtered from image models
        text: '/v1/models',
        audio: '/audio/models',
    },

    // Generation endpoints (OpenAI-compatible)
    generations: {
        images: '/v1/images/generations',
        edits: '/v1/images/edits',
        chat: '/v1/chat/completions',
    },

    // Public endpoints
    public: {
        gallery: 'https://image.pollinations.ai/feed',
    },
} as const;

// Model filtering helpers
export const MODEL_FILTERS = {
    // Filter models that output images
    imageModels: (model: any) => model.output_modalities?.includes('image'),

    // Filter models that output video
    videoModels: (model: any) => model.output_modalities?.includes('video'),

    // Filter models that accept image input (for editing)
    imageEditingModels: (model: any) => model.input_modalities?.includes('image'),

    // Filter models that output text
    textModels: (model: any) => model.output_modalities?.includes('text'),

    // Filter models that output audio
    audioModels: (model: any) => model.output_modalities?.includes('audio'),
} as const;

// API helper functions
export const API_HELPERS = {
    // Get the full URL for model fetching
    getModelsUrl: (type: 'image' | 'video' | 'text' | 'audio' = 'image') => {
        return `${API_CONFIG.baseUrl}${API_CONFIG.models[type]}`;
    },

    // Build image generation URL
    buildImageUrl: (prompt: string, params?: Record<string, any>) => {
        const urlParams = new URLSearchParams();
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== false) {
                    urlParams.set(key, String(value));
                }
            });
        }
        const encodedPrompt = encodeURIComponent(prompt);
        return `${API_CONFIG.baseUrl}${API_CONFIG.imageEndpoint}/${encodedPrompt}?${urlParams.toString()}`;
    },

    // Build video generation URL
    buildVideoUrl: (prompt: string, params?: Record<string, any>) => {
        const urlParams = new URLSearchParams();
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== false) {
                    urlParams.set(key, String(value));
                }
            });
        }
        const encodedPrompt = encodeURIComponent(prompt);
        return `${API_CONFIG.baseUrl}${API_CONFIG.videoEndpoint}/${encodedPrompt}?${urlParams.toString()}`;
    },
} as const;

// Default models by type
export const DEFAULT_MODELS = {
    image: [
        { value: 'flux', label: 'Flux Schnell' },
        { value: 'zimage', label: 'Z-Image Turbo' },
        { value: 'gptimage', label: 'GPT Image 1 Mini' },
        { value: 'gptimage-large', label: 'GPT Image 1.5' },
        { value: 'nanobanana', label: 'NanoBanana' },
        { value: 'nanobanana-2', label: 'NanoBanana 2' },
        { value: 'nanobanana-pro', label: 'NanoBanana Pro' },
        { value: 'klein', label: 'FLUX.2 Klein 4B' },
        { value: 'kontext', label: 'FLUX.1 Kontext' },
        { value: 'seedream5', label: 'Seedream 5.0 Lite' },
        { value: 'seedream', label: 'Seedream 4.0' },
        { value: 'seedream-pro', label: 'Seedream 4.5 Pro' },
        { value: 'qwen-image', label: 'Qwen Image Plus' },
        { value: 'grok-imagine', label: 'Grok Imagine' },
        { value: 'grok-imagine-pro', label: 'Grok Imagine Pro' },
        { value: 'p-image', label: 'Pruna p-image' },
        { value: 'p-image-edit', label: 'Pruna p-image-edit' },
        { value: 'nova-canvas', label: 'Amazon Nova Canvas' },
    ],

    video: [
        { value: 'wan-fast', label: 'Wan 2.2 - Fast (5s, 480p)' },
        { value: 'wan', label: 'Wan 2.6 - Quality (2-15s, 1080p)' },
        { value: 'veo', label: 'Veo 3.1 Fast - Google (Preview)' },
        { value: 'seedance', label: 'Seedance Lite - Better Quality' },
        { value: 'seedance-pro', label: 'Seedance Pro-Fast - Better Prompt Adherence' },
        { value: 'grok-video-pro', label: 'Grok Video Pro - xAI (720p, 1-15s)' },
        { value: 'ltx-2', label: 'LTX-2 - Fast' },
        { value: 'p-video', label: 'Pruna p-video (up to 1080p)' },
        { value: 'nova-reel', label: 'Amazon Nova Reel (6-30s, 720p)' },
    ],

    // Models that support image editing (accept image input)
    imageEditing: [
        { value: 'flux', label: 'Flux Schnell' },
        { value: 'kontext', label: 'FLUX.1 Kontext' },
        { value: 'klein', label: 'FLUX.2 Klein 4B' },
        { value: 'gptimage', label: 'GPT Image 1 Mini' },
        { value: 'gptimage-large', label: 'GPT Image 1.5' },
        { value: 'nanobanana', label: 'NanoBanana' },
    ],
} as const;

// Export all as default
export default API_CONFIG;
