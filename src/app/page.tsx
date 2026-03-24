'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Sparkles, Download, Share2, Maximize2, ZoomIn, ZoomOut,
  Wand2, ImagePlus, History, Settings, Trash2, X, ChevronDown,
  MousePointer2, Hand, PenLine, Grid3x3, Layers, Palette,
  Undo2, Redo2, RotateCcw, Check, Loader2, Eye, EyeOff,
  Copy, ExternalLink, MonitorPlay, Square, Circle
} from 'lucide-react';
import { toast } from 'sonner';
import { pollinationsAPI } from '@/lib/api';
import { storage, generateId } from '@/lib/utils';
import { HistoryItem, GenerationParams } from '@/types';

const ASPECT_RATIOS = [
  { id: '1:1', label: '1:1', width: 1024, height: 1024 },
  { id: '4:3', label: '4:3', width: 1024, height: 768 },
  { id: '16:9', label: '16:9', width: 1280, height: 720 },
  { id: '21:9', label: '21:9', width: 1512, height: 648 },
  { id: '3:4', label: '3:4', width: 768, height: 1024 },
  { id: '9:16', label: '9:16', width: 720, height: 1280 }
];

const ALL_MODIFIERS = [
  'High Resolution', 'Studio Lighting', 'Minimalist', 'Cinematic',
  'Octane Render', 'Volumetric', 'Macro', 'Dramatic', 'Soft Focus',
  'HDR', 'Bokeh', 'Golden Hour'
];

const PRESET_STYLES = [
  { name: 'None', prompt: '' },
  { name: 'Cinematic', prompt: 'cinematic lighting, dramatic, film grain, color graded' },
  { name: 'Anime', prompt: 'anime style, studio ghibli, vibrant colors' },
  { name: 'Photorealistic', prompt: 'photorealistic, ultra detailed, 8k, professional photography' },
  { name: 'Digital Art', prompt: 'digital art, artstation, concept art, illustration' },
  { name: 'Cyberpunk', prompt: 'cyberpunk, neon lights, futuristic, high tech' },
  { name: 'Fantasy', prompt: 'fantasy art, magical, ethereal, glowing, mystical' },
  { name: 'Minimalist', prompt: 'minimalist, clean, simple, geometric, modern' },
];

const COLORS = [
  '#EF8354', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE',
  '#FFFFFF', '#000000',
];

export default function GeneratePage() {
  // UI State
  const [showPanel, setShowPanel] = useState<'none' | 'generate' | 'edit' | 'settings' | 'history'>('generate');
  const [activeTool, setActiveTool] = useState<'pointer' | 'pan' | 'draw'>('pointer');

  // Generation State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<Array<{ id: string; url: string; x: number; y: number; width: number; height: number }>>([]);
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');

  // Parameters
  const [aspectRatio, setAspectRatio] = useState(ASPECT_RATIOS[0]);
  const [styleStrength, setStyleStrength] = useState(75);
  const [guidanceScale, setGuidanceScale] = useState(7.5);
  const [seed, setSeed] = useState(-1);
  const [activeModifiers, setActiveModifiers] = useState<string[]>(['High Resolution']);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState('flux');
  const [selectedPreset, setSelectedPreset] = useState('');

  // Canvas State
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);

  // Drawing State
  const [brushSize, setBrushSize] = useState(4);
  const [brushColor, setBrushColor] = useState('#EF8354');
  const [drawingData, setDrawingData] = useState<Record<string, Array<{ x: number; y: number; color: string; size: number }>>>({});
  const [isDrawing, setIsDrawing] = useState(false);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null);

  // Apply preset style
  const applyPreset = (presetName: string) => {
    const preset = PRESET_STYLES.find((p) => p.name === presetName);
    if (preset) {
      if (preset.prompt && !prompt.includes(preset.prompt)) {
        setPrompt((prev) => (prev ? `${prev}, ${preset.prompt}` : preset.prompt));
      }
      setSelectedPreset(presetName);
    }
  };

  // Handle File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setReferenceImage(result);
        toast.success('Reference image uploaded');
      };
      reader.readAsDataURL(file);
    }
  };

  // Toggle Modifiers
  const toggleModifier = (mod: string) => {
    setActiveModifiers((prev) =>
      prev.includes(mod) ? prev.filter((m) => m !== mod) : [...prev, mod]
    );
  };

  // Generate Image
  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    const apiKey = storage.getApiKey();
    if (!apiKey) {
      toast.error('Please add your API key in settings');
      setShowPanel('settings');
      return;
    }

    pollinationsAPI.setApiKey(apiKey);
    setIsGenerating(true);

    try {
      const actualSeed = seed === -1 ? Math.floor(Math.random() * 1000000) : seed;
      const fullPrompt = activeModifiers.length > 0
        ? `${prompt}, ${activeModifiers.join(', ')}`
        : prompt;

      const params: GenerationParams = {
        model: selectedModel,
        prompt: fullPrompt,
        negativePrompt: negativePrompt || undefined,
        width: aspectRatio.width,
        height: aspectRatio.height,
        seed: actualSeed,
        enhance: true,
        safe: false,
        quality: 'high' as const,
        image: referenceImage || undefined,
      };

      let imageUrl: string;

      if (referenceImage) {
        imageUrl = await pollinationsAPI.generateImageOpenAI({
          prompt: fullPrompt,
          model: selectedModel,
          seed: actualSeed,
          enhance: true,
          safe: false,
        });
      } else {
        imageUrl = await pollinationsAPI.generateImage(params);
      }

      // Add image to canvas at center of view
      const newImage = {
        id: generateId(),
        url: imageUrl,
        x: -pan.x + (window.innerWidth / 2 - aspectRatio.width / 2) / zoom,
        y: -pan.y + (window.innerHeight / 2 - aspectRatio.height / 2) / zoom,
        width: aspectRatio.width,
        height: aspectRatio.height,
      };

      setGeneratedImages((prev) => [...prev, newImage]);

      // Add to history
      const historyItem: HistoryItem = {
        id: generateId(),
        type: 'generate',
        prompt: fullPrompt,
        model: selectedModel,
        imageUrl,
        params,
        createdAt: Date.now(),
        referenceImage: referenceImage || undefined,
      };

      const history = storage.getHistory();
      const newHistory = [historyItem, ...history].slice(0, 50);
      storage.setHistory(newHistory);

      toast.success('Image generated!');
      setReferenceImage(null);
    } catch (error) {
      console.error('Generation error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate image');
    } finally {
      setIsGenerating(false);
    }
  };

  // Canvas Pan Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (activeTool === 'pan' || e.button === 1) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleWheel = useCallback((e: WheelEvent) => {
    if (e.ctrlKey || activeTool === 'pan') {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom((prev) => Math.max(0.1, Math.min(5, prev + delta)));
    }
  }, [activeTool]);

  useEffect(() => {
    const container = canvasContainerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
      return () => container.removeEventListener('wheel', handleWheel);
    }
  }, [handleWheel]);

  // Download image
  const downloadImage = async (imageUrl: string, id: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `pollinations-${id.slice(0, 8)}.png`;
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success('Image downloaded');
    } catch (error) {
      toast.error('Failed to download');
    }
  };

  // Delete image
  const deleteImage = (id: string) => {
    setGeneratedImages((prev) => prev.filter((img) => img.id !== id));
    if (selectedImageId === id) setSelectedImageId(null);
    toast.success('Image removed');
  };

  // Clear all images
  const clearAllImages = () => {
    if (confirm('Remove all images from canvas?')) {
      setGeneratedImages([]);
      setSelectedImageId(null);
      toast.success('Canvas cleared');
    }
  };

  // Reset view
  const resetView = () => {
    setPan({ x: 0, y: 0 });
    setZoom(1);
    toast.success('View reset');
  };

  return (
    <div className="w-full h-screen bg-[#0a0a0f] overflow-hidden relative">
      {/* Top Toolbar */}
      <div className="fixed top-0 left-0 right-0 z-50 glass-panel border-b border-white/10">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Left - Logo & Nav */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#EF8354] to-purple-600 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-bold text-white">Pollinations</span>
            </div>

            <div className="h-6 w-px bg-white/20" />

            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowPanel(showPanel === 'generate' ? 'none' : 'generate')}
                className={`toolbar-btn ${showPanel === 'generate' ? 'bg-[#EF8354] text-white' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
              >
                <Wand2 size={18} />
                Generate
              </button>
              <button
                onClick={() => setShowPanel(showPanel === 'history' ? 'none' : 'history')}
                className={`toolbar-btn ${showPanel === 'history' ? 'bg-[#EF8354] text-white' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
              >
                <Grid3x3 size={18} />
                Gallery
              </button>
              <button
                onClick={() => window.location.href = '/edit'}
                className="toolbar-btn text-zinc-400 hover:text-white hover:bg-white/5"
              >
                <ImagePlus size={18} />
                Edit
              </button>
              <button
                onClick={() => setShowPanel(showPanel === 'settings' ? 'none' : 'settings')}
                className={`toolbar-btn ${showPanel === 'settings' ? 'bg-[#EF8354] text-white' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
              >
                <Settings size={18} />
              </button>
            </div>
          </div>

          {/* Center - Zoom Controls */}
          <div className="flex items-center gap-2 glass-panel rounded-xl p-1">
            <button
              onClick={() => setZoom((z) => Math.max(0.1, z - 0.25))}
              className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <ZoomOut size={16} />
            </button>
            <span className="text-sm text-zinc-400 w-14 text-center">{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => setZoom((z) => Math.min(5, z + 0.25))}
              className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <ZoomIn size={16} />
            </button>
            <div className="w-px h-4 bg-white/20 mx-1" />
            <button
              onClick={resetView}
              className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Reset View"
            >
              <RotateCcw size={16} />
            </button>
          </div>

          {/* Right - Tools & Actions */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 glass-panel rounded-xl p-1">
              <button
                onClick={() => setActiveTool('pointer')}
                className={`p-2 rounded-lg transition-colors ${activeTool === 'pointer' ? 'bg-[#EF8354] text-white' : 'text-zinc-400 hover:text-white hover:bg-white/10'}`}
                title="Select Tool"
              >
                <MousePointer2 size={16} />
              </button>
              <button
                onClick={() => setActiveTool('pan')}
                className={`p-2 rounded-lg transition-colors ${activeTool === 'pan' ? 'bg-[#EF8354] text-white' : 'text-zinc-400 hover:text-white hover:bg-white/10'}`}
                title="Pan Tool (Middle Click)"
              >
                <Hand size={16} />
              </button>
            </div>

            <button
              onClick={clearAllImages}
              className="toolbar-btn text-red-400 hover:text-red-300 hover:bg-red-500/10"
            >
              <Trash2 size={18} />
              Clear All
            </button>
          </div>
        </div>
      </div>

      {/* Infinite Canvas */}
      <div
        ref={canvasContainerRef}
        className={`infinite-canvas pt-16 ${activeTool === 'pan' ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          className="absolute inset-0 origin-top-left"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          }}
        >
          {/* Generated Images */}
          {generatedImages.map((img) => (
            <div
              key={img.id}
              className={`absolute group ${selectedImageId === img.id ? 'ring-2 ring-[#EF8354]' : ''}`}
              style={{
                left: img.x,
                top: img.y,
                width: img.width,
                height: img.height,
              }}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedImageId(img.id);
              }}
            >
              <img
                src={img.url}
                alt="Generated"
                className="w-full h-full object-cover rounded-lg shadow-2xl"
                draggable={false}
              />

              {/* Image Actions */}
              <div className="absolute -top-10 right-0 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    downloadImage(img.url, img.id);
                  }}
                  className="p-2 glass-panel rounded-lg text-white hover:bg-white/20 transition-colors"
                  title="Download"
                >
                  <Download size={16} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteImage(img.id);
                  }}
                  className="p-2 glass-panel rounded-lg text-red-400 hover:bg-red-500/20 transition-colors"
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {/* Dimensions */}
              <div className="absolute bottom-2 left-2 px-2 py-1 glass-panel rounded-md text-xs text-white/80">
                {img.width} × {img.height}
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {generatedImages.length === 0 && (
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            }}
          >
            <div className="text-center">
              <div className="w-20 h-20 rounded-2xl bg-[#EF8354]/10 flex items-center justify-center mx-auto mb-6">
                <Wand2 className="h-10 w-10 text-[#EF8354]" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Start Creating</h2>
              <p className="text-zinc-400">Click "Generate" in the panel below to create images</p>
              <p className="text-zinc-500 text-sm mt-4">Pan: Middle click or Hand tool • Zoom: Ctrl + Scroll</p>
            </div>
          </div>
        )}
      </div>

      {/* Generate Panel */}
      {showPanel === 'generate' && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-4xl px-4">
          <div className="glass-panel rounded-3xl p-6 border border-white/10">
            {/* Prompt Input */}
            <div className="mb-4">
              <textarea
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#EF8354]/50 resize-none h-24"
                placeholder="Describe what you want to create..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </div>

            {/* Style Presets */}
            <div className="flex flex-wrap gap-2 mb-4">
              {PRESET_STYLES.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => applyPreset(preset.name)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${selectedPreset === preset.name
                      ? 'bg-[#EF8354] text-white'
                      : 'bg-white/10 text-zinc-400 hover:bg-white/20'
                    }`}
                >
                  {preset.name}
                </button>
              ))}
            </div>

            {/* Settings Row */}
            <div className="flex flex-wrap items-center gap-4 mb-4">
              {/* Aspect Ratio */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-400">Ratio:</span>
                <div className="flex gap-1">
                  {ASPECT_RATIOS.slice(0, 4).map((ratio) => (
                    <button
                      key={ratio.id}
                      onClick={() => setAspectRatio(ratio)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${aspectRatio.id === ratio.id
                          ? 'bg-[#EF8354] text-white'
                          : 'bg-white/10 text-zinc-400 hover:bg-white/20'
                        }`}
                    >
                      {ratio.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Model */}
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="bg-white/10 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#EF8354]/50"
              >
                <option value="flux" className="bg-[#1a1a2e]">Flux Schnell</option>
                <option value="zimage" className="bg-[#1a1a2e]">Z-Image Turbo</option>
                <option value="gptimage" className="bg-[#1a1a2e]">GPT Image 1.5</option>
                <option value="nanobanana" className="bg-[#1a1a2e]">NanoBanana</option>
                <option value="klein" className="bg-[#1a1a2e]">FLUX.2 Klein</option>
              </select>
            </div>

            {/* Modifiers */}
            <div className="flex flex-wrap gap-2 mb-4">
              {ALL_MODIFIERS.slice(0, 6).map((mod) => {
                const isActive = activeModifiers.includes(mod);
                return (
                  <button
                    key={mod}
                    onClick={() => toggleModifier(mod)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${isActive
                        ? 'bg-[#EF8354]/20 text-[#EF8354] border-[#EF8354]/50'
                        : 'bg-white/5 text-zinc-400 border-white/10 hover:border-white/30'
                      }`}
                  >
                    {isActive && <Check size={10} className="inline mr-1" />}
                    {mod}
                  </button>
                );
              })}
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              className={`w-full py-4 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all ${isGenerating || !prompt.trim()
                  ? 'bg-zinc-600 cursor-not-allowed'
                  : 'bg-gradient-to-r from-[#EF8354] to-purple-600 hover:from-[#e27344] hover:to-purple-500 shadow-lg shadow-[#EF8354]/25'
                }`}
            >
              {isGenerating ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles size={20} />
                  Generate Image
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* History Panel */}
      {showPanel === 'history' && (
        <div className="fixed top-20 right-6 z-50 w-80">
          <div className="glass-panel rounded-2xl p-4 border border-white/10 max-h-[calc(100vh-120px)] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white">Gallery</h3>
              <button
                onClick={() => setShowPanel('none')}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10"
              >
                <X size={16} />
              </button>
            </div>

            {storage.getHistory().length === 0 ? (
              <div className="text-center py-8">
                <Sparkles className="h-8 w-8 text-zinc-600 mx-auto mb-2" />
                <p className="text-sm text-zinc-500">No images yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {storage.getHistory().slice(0, 12).map((item) => (
                  <div
                    key={item.id}
                    className="aspect-square rounded-lg overflow-hidden cursor-pointer group relative"
                    onClick={() => {
                      // Load image to canvas
                      const newImage = {
                        id: generateId(),
                        url: item.imageUrl,
                        x: -pan.x + (window.innerWidth / 2 - 256),
                        y: -pan.y + (window.innerHeight / 2 - 256),
                        width: 512,
                        height: 512,
                      };
                      setGeneratedImages((prev) => [...prev, newImage]);
                      setShowPanel('none');
                      toast.success('Added to canvas');
                    }}
                  >
                    <img src={item.imageUrl} alt={item.prompt} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-xs text-white font-medium">Add to Canvas</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Settings Panel */}
      {showPanel === 'settings' && (
        <div className="fixed top-20 right-6 z-50 w-80">
          <div className="glass-panel rounded-2xl p-4 border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white">Settings</h3>
              <button
                onClick={() => setShowPanel('none')}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-zinc-400 mb-2 block">API Key</label>
                <ApiKeyInput />
              </div>

              <div className="pt-4 border-t border-white/10">
                <p className="text-xs text-zinc-500">
                  Get your free API key at{' '}
                  <a
                    href="https://enter.pollinations.ai"
                    target="_blank"
                    className="text-[#EF8354] hover:underline"
                  >
                    enter.pollinations.ai
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// API Key Input Component
function ApiKeyInput() {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    const saved = storage.getApiKey();
    if (saved) setApiKey(saved);
  }, []);

  const handleSave = () => {
    storage.setApiKey(apiKey.trim());
    toast.success('API key saved');
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type={showKey ? 'text' : 'password'}
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="sk_..."
          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#EF8354]/50"
        />
        <button
          onClick={() => setShowKey(!showKey)}
          className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10"
        >
          {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      <button
        onClick={handleSave}
        className="w-full py-2 bg-[#EF8354] text-white rounded-lg text-sm font-medium hover:bg-[#e27344] transition-colors"
      >
        Save API Key
      </button>
    </div>
  );
}
