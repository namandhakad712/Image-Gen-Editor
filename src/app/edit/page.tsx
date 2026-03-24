'use client';

import { useState, useEffect } from 'react';
import { Image as ImageIcon, Wand2, Download, Trash2, Eye } from 'lucide-react';
import { Button } from '@/components/Button';
import { Textarea } from '@/components/Textarea';
import { Select } from '@/components/Select';
import { Slider } from '@/components/Slider';
import { Toggle } from '@/components/Toggle';
import { Input } from '@/components/Input';
import { ImageUpload } from '@/components/ImageUpload';
import { ImageModal } from '@/components/ImageModal';
import { pollinationsAPI } from '@/lib/api';
import { storage, generateId } from '@/lib/utils';
import { HistoryItem, ImageModel } from '@/types';
import { toast } from 'sonner';

const EDIT_MODELS = [
  { id: 'flux', name: 'Flux Schnell' },
  { id: 'kontext', name: 'FLUX.1 Kontext' },
  { id: 'nanobanana', name: 'NanoBanana' },
  { id: 'nanobanana-2', name: 'NanoBanana 2' },
  { id: 'nanobanana-pro', name: 'NanoBanana Pro' },
  { id: 'gptimage', name: 'GPT Image 1 Mini' },
  { id: 'gptimage-large', name: 'GPT Image 1.5' },
  { id: 'klein', name: 'FLUX.2 Klein' },
  { id: 'p-image-edit', name: 'Pruna Edit' },
  { id: 'qwen-image', name: 'Qwen Image' },
  { id: 'nova-canvas', name: 'Amazon Nova Canvas' },
];

export default function EditPage() {
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState('flux');
  const [models, setModels] = useState<ImageModel[]>([]);
  const [strength, setStrength] = useState(0.7);
  const [seed, setSeed] = useState(-1);
  const [enhance, setEnhance] = useState(true);
  const [safe, setSafe] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedImage, setEditedImage] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [viewingItem, setViewingItem] = useState<HistoryItem | null>(null);

  useEffect(() => {
    const apiKey = storage.getApiKey();
    pollinationsAPI.setApiKey(apiKey);

    pollinationsAPI.getImageModels().then((fetchedModels) => {
      if (fetchedModels.length > 0) {
        setModels(fetchedModels);
      }
    });

    setHistory(storage.getHistory());
  }, []);

  const handleEdit = async () => {
    if (!sourceImage) {
      toast.error('Please upload an image to edit');
      return;
    }
    if (!prompt.trim()) {
      toast.error('Please describe the edit you want to make');
      return;
    }

    const apiKey = storage.getApiKey();
    if (!apiKey) {
      toast.error('Please add your API key in Settings');
      return;
    }

    pollinationsAPI.setApiKey(apiKey);
    setIsEditing(true);

    try {
      const actualSeed = seed === -1 ? Math.floor(Math.random() * 1000000) : seed;

      // For image editing, use the OpenAI-compatible endpoint
      const response = await fetch('https://gen.pollinations.ai/v1/images/edits', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          image: sourceImage,
          model: selectedModel,
          seed: actualSeed,
          enhance,
          safe,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || 'Failed to edit image');
      }

      const data = await response.json();
      const imageUrl = data.data?.[0]?.url || data.data?.[0]?.b64_json;

      if (!imageUrl) {
        throw new Error('No image returned from API');
      }

      setEditedImage(imageUrl);

      // Add to history
      const historyItem: HistoryItem = {
        id: generateId(),
        type: 'edit',
        prompt,
        model: selectedModel,
        imageUrl,
        thumbnailUrl: sourceImage,
        params: {
          model: selectedModel,
          prompt,
          width: 1024,
          height: 1024,
          seed: actualSeed,
          enhance,
          safe,
        },
        createdAt: Date.now(),
        referenceImage: sourceImage,
      };

      const newHistory = [historyItem, ...history].slice(0, 50);
      setHistory(newHistory);
      storage.setHistory(newHistory);

      toast.success('Image edited successfully!');
    } catch (error) {
      console.error('Edit error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to edit image');
    } finally {
      setIsEditing(false);
    }
  };

  const handleDeleteFromHistory = (id: string) => {
    const newHistory = history.filter((item) => item.id !== id);
    setHistory(newHistory);
    storage.setHistory(newHistory);
    toast.success('Removed from history');
  };

  const handleUseAsSource = (url: string) => {
    setSourceImage(url);
    setEditedImage(null);
    toast.success('Image set as source');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
          <Wand2 className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Image Editor</h1>
          <p className="text-sm text-muted-foreground">Transform images with AI</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left Column - Controls */}
        <div className="space-y-6">
          {/* Source Image */}
          <div className="bg-card rounded-xl p-4 border border-input">
            <label className="block text-sm font-medium text-foreground mb-3">
              Source Image
            </label>
            <ImageUpload
              onImageSelect={setSourceImage}
              onImageClear={() => setSourceImage(null)}
              selectedImage={sourceImage}
              label="Upload image to edit"
            />
          </div>

          {/* Edit Prompt */}
          <div className="bg-card rounded-xl p-4 border border-input">
            <Textarea
              label="Edit Instructions"
              placeholder="Describe how you want to modify the image..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              showCount
              maxLength={2000}
              helperText="Be specific about the changes you want"
            />

            {/* Quick suggestions */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-foreground mb-2">
                Quick Suggestions
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  'Make it more vibrant',
                  'Change to black and white',
                  'Add a sunset background',
                  'Make it look like a painting',
                  'Add snow/winter effect',
                  'Change the season to autumn',
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setPrompt(suggestion)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-all"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Model Selection */}
          <div className="bg-card rounded-xl p-4 border border-input">
            <label className="block text-sm font-medium text-foreground mb-3">
              Edit Model
            </label>
            <div className="grid grid-cols-2 gap-2">
              {EDIT_MODELS.map((model) => (
                <button
                  key={model.id}
                  onClick={() => setSelectedModel(model.id)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    selectedModel === model.id
                      ? 'border-primary bg-accent/50'
                      : 'border-input bg-card hover:border-primary/50'
                  }`}
                >
                  <span className="text-sm font-medium">{model.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Settings */}
          <div className="bg-card rounded-xl p-4 border border-input space-y-4">
            <Slider
              label="Edit Strength"
              min={0.1}
              max={1}
              step={0.1}
              value={strength}
              onChange={(e) => setStrength(parseFloat(e.target.value))}
              valueLabel={`${Math.round(strength * 100)}%`}
              helperText="Higher = more changes"
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Seed"
                type="number"
                value={seed}
                onChange={(e) => setSeed(parseInt(e.target.value) || -1)}
                helperText="-1 for random"
              />
            </div>

            <div className="border-t border-input pt-4">
              <Toggle
                checked={enhance}
                onChange={(e) => setEnhance(e.target.checked)}
                label="AI Prompt Enhance"
              />
              <Toggle
                checked={safe}
                onChange={(e) => setSafe(e.target.checked)}
                label="Safe Mode"
              />
            </div>
          </div>

          {/* Edit Button */}
          <Button
            onClick={handleEdit}
            disabled={isEditing || !sourceImage || !prompt.trim()}
            isLoading={isEditing}
            className="w-full h-12 text-base"
            size="lg"
          >
            {isEditing ? (
              'Editing...'
            ) : (
              <>
                <Wand2 className="h-5 w-5 mr-2" />
                Apply Edit
              </>
            )}
          </Button>
        </div>

        {/* Right Column - Preview & History */}
        <div className="space-y-6">
          {/* Result */}
          <div className="bg-card rounded-xl p-4 border border-input">
            <h2 className="text-lg font-semibold text-foreground mb-4">Result</h2>
            
            {editedImage ? (
              <div className="space-y-4">
                {/* Before/After */}
                <div className="grid grid-cols-2 gap-4">
                  {sourceImage && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Before</p>
                      <div className="aspect-square rounded-lg overflow-hidden bg-secondary/50">
                        <img src={sourceImage} alt="Before" className="w-full h-full object-cover" />
                      </div>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">After</p>
                    <div className="aspect-square rounded-lg overflow-hidden bg-secondary/50">
                      <img src={editedImage} alt="After" className="w-full h-full object-cover" />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="aspect-square rounded-lg bg-secondary/30 border border-input flex flex-col items-center justify-center text-muted-foreground">
                <ImageIcon className="h-16 w-16 mb-4 opacity-50" />
                <p>Edited image will appear here</p>
              </div>
            )}
          </div>

          {/* Recent Edits */}
          <div className="bg-card rounded-xl p-4 border border-input">
            <h2 className="text-lg font-semibold text-foreground mb-4">Recent Edits</h2>
            {history.filter((h) => h.type === 'edit').length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {history
                  .filter((h) => h.type === 'edit')
                  .slice(0, 4)
                  .map((item) => (
                    <div key={item.id} className="group relative bg-secondary rounded-lg overflow-hidden border border-input">
                      <img src={item.imageUrl} alt={item.prompt} className="w-full aspect-square object-cover" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setViewingItem(item)}
                          className="p-2"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleUseAsSource(item.imageUrl)}
                          className="p-2"
                        >
                          <ImageIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleDeleteFromHistory(item.id)}
                          className="p-2"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="absolute top-2 left-2 px-2 py-1 bg-black/70 rounded text-xs text-white">
                        {item.model}
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <ImageIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No edits yet</p>
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
