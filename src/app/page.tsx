'use client';

import { useState, useEffect, useCallback } from 'react';
import { Sparkles, Zap, Image as ImageIcon, History } from 'lucide-react';
import { Button } from '@/components/Button';
import { Textarea } from '@/components/Textarea';
import { Input } from '@/components/Input';
import { Select } from '@/components/Select';
import { Slider } from '@/components/Slider';
import { Toggle } from '@/components/Toggle';
import { ModelSelector } from '@/components/ModelSelector';
import { ImageCard } from '@/components/ImageCard';
import { ImageModal } from '@/components/ImageModal';
import { ImageUpload } from '@/components/ImageUpload';
import { pollinationsAPI } from '@/lib/api';
import { storage, generateId } from '@/lib/utils';
import { HistoryItem, GenerationParams, ImageModel } from '@/types';
import { toast } from 'sonner';

const ASPECT_RATIOS = [
  { value: '1:1', label: 'Square (1:1)', width: 1024, height: 1024 },
  { value: '16:9', label: 'Landscape (16:9)', width: 1280, height: 720 },
  { value: '9:16', label: 'Portrait (9:16)', width: 720, height: 1280 },
  { value: '4:3', label: 'Standard (4:3)', width: 1024, height: 768 },
  { value: '3:4', label: 'Vertical (3:4)', width: 768, height: 1024 },
  { value: '3:2', label: 'Photo (3:2)', width: 1024, height: 683 },
  { value: '2:3', label: 'Portrait (2:3)', width: 683, height: 1024 },
];

const PRESET_STYLES = [
  { name: 'None', prompt: '' },
  { name: 'Cinematic', prompt: 'cinematic lighting, dramatic, film grain, color graded, anamorphic lens' },
  { name: 'Anime', prompt: 'anime style, studio ghibli, makoto shinkai, vibrant colors, detailed background' },
  { name: 'Photorealistic', prompt: 'photorealistic, ultra detailed, 8k, professional photography, natural lighting' },
  { name: 'Digital Art', prompt: 'digital art, artstation, concept art, smooth, sharp focus, illustration' },
  { name: 'Oil Painting', prompt: 'oil painting, textured brush strokes, classical art style, rich colors' },
  { name: 'Cyberpunk', prompt: 'cyberpunk, neon lights, futuristic, high tech, dark atmosphere, rain' },
  { name: 'Fantasy', prompt: 'fantasy art, magical, ethereal, glowing, mystical, detailed fantasy landscape' },
  { name: 'Minimalist', prompt: 'minimalist, clean, simple, geometric, limited color palette, modern' },
];

export default function GeneratePage() {
  // State
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState('flux');
  const [models, setModels] = useState<ImageModel[]>([]);
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [seed, setSeed] = useState(-1);
  const [enhance, setEnhance] = useState(true);
  const [safe, setSafe] = useState(false);
  const [quality, setQuality] = useState<'low' | 'medium' | 'high' | 'hd'>('medium');
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selectedPreset, setSelectedPreset] = useState('');
  const [viewingItem, setViewingItem] = useState<HistoryItem | null>(null);
  const [useReference, setUseReference] = useState(false);

  // Load models and history on mount
  useEffect(() => {
    const apiKey = storage.getApiKey();
    pollinationsAPI.setApiKey(apiKey);

    pollinationsAPI.getImageModels().then((fetchedModels) => {
      if (fetchedModels.length > 0) {
        setModels(fetchedModels);
      } else {
        // Fallback models
        setModels([
          { id: 'flux', object: 'model', created: 0, input_modalities: ['text'], output_modalities: ['image'], supported_endpoints: [] },
          { id: 'zimage', object: 'model', created: 0, input_modalities: ['text'], output_modalities: ['image'], supported_endpoints: [] },
          { id: 'gptimage', object: 'model', created: 0, input_modalities: ['text', 'image'], output_modalities: ['image'], supported_endpoints: [] },
          { id: 'nanobanana', object: 'model', created: 0, input_modalities: ['text', 'image'], output_modalities: ['image'], supported_endpoints: [] },
          { id: 'seedream5', object: 'model', created: 0, input_modalities: ['text', 'image'], output_modalities: ['image'], supported_endpoints: [] },
          { id: 'klein', object: 'model', created: 0, input_modalities: ['text', 'image'], output_modalities: ['image'], supported_endpoints: [] },
          { id: 'grok-imagine', object: 'model', created: 0, input_modalities: ['text'], output_modalities: ['image'], supported_endpoints: [] },
          { id: 'p-image', object: 'model', created: 0, input_modalities: ['text'], output_modalities: ['image'], supported_endpoints: [] },
        ]);
      }
    });

    setHistory(storage.getHistory());
  }, []);

  // Apply preset style
  const applyPreset = useCallback((presetName: string) => {
    const preset = PRESET_STYLES.find((p) => p.name === presetName);
    if (preset) {
      if (preset.prompt && !prompt.includes(preset.prompt)) {
        setPrompt((prev) => (prev ? `${prev}, ${preset.prompt}` : preset.prompt));
      }
      setSelectedPreset(presetName);
    }
  }, [prompt]);

  // Generate image
  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    const apiKey = storage.getApiKey();
    if (!apiKey) {
      toast.error('Please add your API key in Settings');
      return;
    }

    pollinationsAPI.setApiKey(apiKey);
    setIsGenerating(true);

    try {
      const ratio = ASPECT_RATIOS.find((r) => r.value === aspectRatio) || ASPECT_RATIOS[0];
      const actualSeed = seed === -1 ? Math.floor(Math.random() * 1000000) : seed;

      const params: GenerationParams = {
        model: selectedModel,
        prompt,
        negativePrompt: negativePrompt || undefined,
        width: ratio.width,
        height: ratio.height,
        seed: actualSeed,
        enhance,
        safe,
        quality,
        image: useReference && referenceImage ? referenceImage : undefined,
      };

      let imageUrl: string;
      
      if (useReference && referenceImage) {
        // Use OpenAI-compatible endpoint for image-to-image
        imageUrl = await pollinationsAPI.generateImageOpenAI({
          prompt,
          model: selectedModel,
          seed: actualSeed,
          enhance,
          safe,
        });
      } else {
        imageUrl = await pollinationsAPI.generateImage(params);
      }

      setGeneratedImage(imageUrl);

      // Add to history
      const historyItem: HistoryItem = {
        id: generateId(),
        type: 'generate',
        prompt,
        model: selectedModel,
        imageUrl,
        params,
        createdAt: Date.now(),
        referenceImage: useReference ? referenceImage : undefined,
      };

      const newHistory = [historyItem, ...history].slice(0, 50);
      setHistory(newHistory);
      storage.setHistory(newHistory);

      toast.success('Image generated successfully!');
    } catch (error) {
      console.error('Generation error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate image');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteFromHistory = (id: string) => {
    const newHistory = history.filter((item) => item.id !== id);
    setHistory(newHistory);
    storage.setHistory(newHistory);
    toast.success('Removed from history');
  };

  const handleUseReference = (url: string) => {
    setReferenceImage(url);
    setUseReference(true);
    toast.success('Reference image set');
  };

  const currentRatio = ASPECT_RATIOS.find((r) => r.value === aspectRatio) || ASPECT_RATIOS[0];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/20 via-purple-600/20 to-primary/20 p-8 border border-primary/30 glow-primary">
        <div className="absolute inset-0 bg-grid-white/5 bg-[size:20px_20px]" />
        <div className="relative flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center animate-float shadow-lg shadow-primary/30">
            <Sparkles className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-400">Image Generator</h1>
            <p className="text-sm text-muted-foreground mt-1">Transform your ideas into stunning visuals with AI</p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Left Column - Controls */}
        <div className="space-y-6">
          {/* Prompt */}
          <div className="bg-card rounded-2xl p-6 border border-input card-hover">
            <Textarea
              label="✨ Your Prompt"
              placeholder="Describe the image you want to create..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              showCount
              maxLength={2000}
              helperText="Be descriptive for better results"
            />

            {/* Preset Styles */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-foreground mb-2">
                🎨 Quick Styles
              </label>
              <div className="flex flex-wrap gap-2">
                {PRESET_STYLES.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => applyPreset(preset.name)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                      selectedPreset === preset.name
                        ? 'bg-gradient-to-r from-primary to-purple-600 text-white shadow-lg shadow-primary/30'
                        : 'bg-secondary text-secondary-foreground hover:bg-secondary/80 hover:scale-105'
                    }`}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Negative Prompt */}
          <div className="bg-card rounded-2xl p-6 border border-input card-hover">
            <Textarea
              label="🚫 Negative Prompt"
              placeholder="What to exclude from the image..."
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
              rows={2}
              helperText="Optional: elements you don't want in the image"
            />
          </div>

          {/* Model Selection */}
          <div className="bg-card rounded-2xl p-6 border border-input card-hover">
            <label className="block text-sm font-medium text-foreground mb-3">
              🤖 AI Model
            </label>
            <ModelSelector
              models={models}
              selectedModel={selectedModel}
              onModelSelect={setSelectedModel}
            />
          </div>

          {/* Reference Image */}
          <div className="bg-card rounded-2xl p-6 border border-input card-hover">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-foreground">
                🖼️ Reference Image
              </label>
              <Toggle
                checked={useReference}
                onChange={(e) => setUseReference(e.target.checked)}
                label="Use for img2img"
              />
            </div>
            <ImageUpload
              onImageSelect={setReferenceImage}
              onImageClear={() => setReferenceImage(null)}
              selectedImage={referenceImage}
              label={useReference ? 'Upload reference image' : 'Upload image (optional)'}
            />
          </div>

          {/* Settings */}
          <div className="bg-card rounded-2xl p-6 border border-input card-hover space-y-4">
            <Select
              label="📐 Aspect Ratio"
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value)}
              options={ASPECT_RATIOS.map((r) => ({ value: r.value, label: r.label }))}
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="🎲 Seed"
                type="number"
                value={seed}
                onChange={(e) => setSeed(parseInt(e.target.value) || -1)}
                helperText="-1 for random"
              />
              <Select
                label="💎 Quality"
                value={quality}
                onChange={(e) => setQuality(e.target.value as typeof quality)}
                options={[
                  { value: 'low', label: 'Low' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'high', label: 'High' },
                  { value: 'hd', label: 'HD' },
                ]}
              />
            </div>

            <div className="border-t border-input pt-4 space-y-3">
              <Toggle
                checked={enhance}
                onChange={(e) => setEnhance(e.target.checked)}
                label="✨ AI Prompt Enhance"
                description="Let AI improve your prompt for better results"
              />
              <Toggle
                checked={safe}
                onChange={(e) => setSafe(e.target.checked)}
                label="🛡️ Safe Mode"
                description="Enable content filtering"
              />
            </div>
          </div>

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            isLoading={isGenerating}
            className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 glow-primary-hover transition-all duration-300"
            size="lg"
          >
            {isGenerating ? (
              <span className="animate-pulse-slow">⚡ Generating Magic...</span>
            ) : (
              <>
                <Zap className="h-5 w-5 mr-2" />
                Generate Image
              </>
            )}
          </Button>
        </div>

        {/* Right Column - Preview & History */}
        <div className="space-y-6">
          {/* Generated Image Preview */}
          <div className="bg-card rounded-2xl p-6 border border-input card-hover">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <span className="text-xl">🎨</span> Result
            </h2>
            {generatedImage ? (
              <div className="aspect-square rounded-xl overflow-hidden bg-secondary/50 border border-input animate-reveal glow-primary">
                {selectedModel.includes('video') || selectedModel.includes('wan') || selectedModel.includes('veo') || selectedModel.includes('seedance') || selectedModel.includes('ltx') || selectedModel.includes('nova-reel') ? (
                  <video
                    src={generatedImage}
                    className="w-full h-full object-cover"
                    controls
                    autoPlay
                    loop
                  />
                ) : (
                  <img
                    src={generatedImage}
                    alt="Generated"
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
            ) : (
              <div className="aspect-square rounded-xl bg-gradient-to-br from-secondary/30 to-secondary/10 border border-input flex flex-col items-center justify-center text-muted-foreground">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/10 blur-xl rounded-full animate-pulse-slow" />
                  <ImageIcon className="h-20 w-20 mb-4 opacity-30 relative" />
                </div>
                <p className="text-sm">Your masterpiece will appear here</p>
                <p className="text-xs mt-1 opacity-60">Enter a prompt and click Generate</p>
              </div>
            )}
          </div>

          {/* Recent History */}
          <div className="bg-card rounded-2xl p-6 border border-input card-hover">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <span className="text-xl">📚</span> Recent Creations
            </h2>
            {history.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {history.slice(0, 4).map((item) => (
                  <ImageCard
                    key={item.id}
                    item={item}
                    onDelete={handleDeleteFromHistory}
                    onView={setViewingItem}
                    onUseReference={handleUseReference}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <div className="relative inline-block">
                  <div className="absolute inset-0 bg-primary/10 blur-xl rounded-full animate-pulse-slow" />
                  <History className="h-16 w-16 mx-auto mb-4 opacity-20 relative" />
                </div>
                <p className="text-sm">No images generated yet</p>
                <p className="text-xs mt-1 opacity-60">Start creating to see your history here</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Image Modal */}
      {viewingItem && (
        <ImageModal item={viewingItem} onClose={() => setViewingItem(null)} />
      )}
    </div>
  );
}
