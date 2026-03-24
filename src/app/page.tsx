'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  LayoutGrid, Settings, MousePointer2, Hand, PenLine,
  ImagePlus, ChevronDown, ChevronsLeft, Sparkles, Plus,
  SlidersHorizontal, Menu, X, Loader2, Upload, Trash2, Check,
  Wand2, History, Download, Share2, Maximize2, ZoomIn
} from 'lucide-react';
import { toast } from 'sonner';
import { pollinationsAPI } from '@/lib/api';
import { storage, generateId } from '@/lib/utils';
import { HistoryItem, GenerationParams } from '@/types';

const ASPECT_RATIOS = [
  { id: '1:1', label: '1:1', shapeClass: 'shape-1-1', width: 1024, height: 1024 },
  { id: '4:3', label: '4:3', shapeClass: 'shape-4-3', width: 1024, height: 768 },
  { id: '16:9', label: '16:9', shapeClass: 'shape-16-9', width: 1280, height: 720 },
  { id: '21:9', label: '21:9', shapeClass: 'shape-21-9', width: 1512, height: 648 },
  { id: '3:4', label: '3:4', shapeClass: 'shape-3-4', width: 768, height: 1024 },
  { id: '9:16', label: '9:16', shapeClass: 'shape-9-16', width: 720, height: 1280 }
];

const ALL_MODIFIERS = [
  'High Resolution', 'Studio Lighting', 'Minimalist', 'Cinematic',
  'Octane Render', 'Volumetric', 'Macro', 'Dramatic', 'Soft Focus',
  'HDR', 'Bokeh', 'Golden Hour'
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
  // UI State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [activeTool, setActiveTool] = useState<'pointer' | 'hand' | 'pen'>('pointer');

  // Generation State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');

  // Parameters
  const [aspectRatio, setAspectRatio] = useState(ASPECT_RATIOS[2]);
  const [styleStrength, setStyleStrength] = useState(75);
  const [guidanceScale, setGuidanceScale] = useState(7.5);
  const [seed, setSeed] = useState(-1);
  const [steps, setSteps] = useState(30);
  const [activeModifiers, setActiveModifiers] = useState<string[]>(['High Resolution']);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState('flux');
  const [selectedPreset, setSelectedPreset] = useState('');

  // Canvas State
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });

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
      toast.error('Please add your API key in Settings');
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

      setGeneratedImage(imageUrl);

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

      toast.success('Image generated successfully!');
      setActiveTool('pointer');
    } catch (error) {
      console.error('Generation error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate image');
    } finally {
      setIsGenerating(false);
    }
  };

  // Canvas Pan Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (activeTool === 'hand' || (activeTool === 'pointer' && e.button === 1)) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    }

    // Drawing logic
    if (activeTool === 'pen' && isDrawing && drawingCanvasRef.current) {
      const canvas = drawingCanvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (canvas.width / rect.width);
        const y = (e.clientY - rect.top) * (canvas.height / rect.height);

        ctx.strokeStyle = '#EF8354';
        ctx.lineWidth = 4 * zoom;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        ctx.moveTo(lastPos.x, lastPos.y);
        ctx.lineTo(x, y);
        ctx.stroke();

        setLastPos({ x, y });
      }
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setIsDrawing(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || activeTool === 'hand') {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom((prev) => Math.max(0.5, Math.min(3, prev + delta)));
    }
  };

  // Drawing handlers
  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (activeTool !== 'pen') return;

    const canvas = drawingCanvasRef.current;
    if (!canvas) return;

    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = (clientX - rect.left) * (canvas.width / rect.width);
    const y = (clientY - rect.top) * (canvas.height / rect.height);

    setLastPos({ x, y });

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.strokeStyle = '#EF8354';
      ctx.lineWidth = 4 * zoom;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  };

  const clearDrawing = () => {
    const canvas = drawingCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  const downloadImage = () => {
    if (!generatedImage) return;

    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = `pollinations-${generateId()}.png`;
    link.click();
    toast.success('Image downloaded');
  };

  // Reset canvas when image changes
  useEffect(() => {
    setPan({ x: 0, y: 0 });
    setZoom(1);
    clearDrawing();
  }, [generatedImage]);

  // Setup canvas size for drawing
  useEffect(() => {
    if (drawingCanvasRef.current && canvasRef.current) {
      const canvas = drawingCanvasRef.current;
      const container = canvasRef.current;
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    }
  }, [generatedImage, aspectRatio]);

  return (
    <div className="w-full h-[100dvh] bg-[#18181a] dark-dots p-2 md:p-6 lg:p-8 flex items-center justify-center selection:bg-[#EF8354] selection:text-white relative overflow-hidden">
      {/* Main Container */}
      <div
        ref={containerRef}
        className="w-full h-full max-w-[1600px] rounded-[24px] md:rounded-[32px] overflow-hidden light-grid shadow-2xl ring-1 ring-white/10 relative flex flex-col items-center justify-center"
      >
        {/* Top Navigation */}
        <div className="absolute top-4 left-4 md:top-6 md:left-6 z-40 flex items-center gap-2">
          <div className="glass-pill rounded-full flex items-center p-1.5 pr-2 md:pr-4 shadow-sm">
            <button
              className="md:hidden p-2 rounded-full hover:bg-black/5 text-zinc-700 transition-colors"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div className="hidden md:block w-px h-4 bg-zinc-200 mx-1"></div>
            <button
              onClick={() => window.location.href = '/history'}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-black/5 text-zinc-700 transition-colors font-medium text-sm"
            >
              <LayoutGrid size={16} />
              <span className="hidden sm:inline">Gallery</span>
            </button>
            <div className="w-px h-4 bg-zinc-200 mx-2"></div>
            <button
              onClick={() => window.location.href = '/settings'}
              className="p-1.5 rounded-full hover:bg-black/5 text-zinc-500 transition-colors"
            >
              <Settings size={16} />
            </button>
          </div>
        </div>

        {/* Right Tools */}
        <div className="absolute top-4 right-4 md:top-6 md:right-6 z-40">
          <div className="glass-pill rounded-full flex flex-row md:flex-col items-center p-1.5 md:p-2 gap-1 md:gap-2">
            <button
              onClick={() => setActiveTool('pointer')}
              className={`p-2 rounded-full transition-colors ${activeTool === 'pointer' ? 'bg-[#EF8354]/10 text-[#EF8354]' : 'text-zinc-500 hover:text-black hover:bg-black/5'
                }`}
              title="Select Tool"
            >
              <MousePointer2 size={18} />
            </button>
            <button
              onClick={() => setActiveTool('hand')}
              className={`p-2 rounded-full transition-colors ${activeTool === 'hand' ? 'bg-[#EF8354]/10 text-[#EF8354]' : 'text-zinc-500 hover:text-black hover:bg-black/5'
                }`}
              title="Pan Tool"
            >
              <Hand size={18} />
            </button>
            <button
              onClick={() => setActiveTool('pen')}
              className={`p-2 rounded-full transition-colors ${activeTool === 'pen' ? 'bg-[#EF8354]/10 text-[#EF8354]' : 'text-zinc-500 hover:text-black hover:bg-black/5'
                }`}
              title="Draw Tool"
            >
              <PenLine size={18} />
            </button>
            {activeTool === 'pen' && (
              <button
                onClick={clearDrawing}
                className="p-2 rounded-full text-zinc-500 hover:text-red-500 hover:bg-black/5 transition-colors"
                title="Clear Drawing"
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Canvas Workspace */}
        <div
          className="absolute inset-0 flex items-center justify-center p-4 pt-20 pb-48 md:pb-32 md:pl-[380px] md:pr-24 z-0"
          style={{ overflow: 'hidden' }}
        >
          <div
            ref={canvasRef}
            className={`relative w-full max-h-full rounded-2xl md:rounded-3xl shadow-2xl transition-all duration-500 ease-in-out flex items-center justify-center overflow-hidden bg-white ${activeTool === 'hand' ? 'cursor-grab active:cursor-grabbing' : activeTool === 'pen' ? 'cursor-crosshair' : 'cursor-default'
              }`}
            style={{
              aspectRatio: aspectRatio.label.includes(':') ? aspectRatio.label as `${number}:${number}` : '1/1',
              maxWidth: '100%',
              border: '1px solid rgba(0,0,0,0.05)',
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'center center',
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
          >
            {generatedImage ? (
              <>
                <img
                  src={generatedImage}
                  alt="Generated"
                  className={`w-full h-full object-cover transition-all duration-700 ${isGenerating ? 'scale-105 blur-md' : 'scale-100 blur-0'
                    }`}
                  style={{ filter: 'contrast(1.1) brightness(0.9)' }}
                  draggable={false}
                />
                {/* Drawing Canvas Overlay */}
                {activeTool === 'pen' && !isGenerating && (
                  <canvas
                    ref={drawingCanvasRef}
                    className="absolute inset-0 w-full h-full z-20 touch-none"
                    onMouseDown={startDrawing}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onTouchStart={startDrawing}
                    onTouchMove={handleMouseMove}
                    onTouchEnd={handleMouseUp}
                  />
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center text-zinc-400 p-8">
                <Wand2 size={64} className="mb-4 opacity-20" />
                <p className="text-sm font-medium">Enter a prompt and generate your image</p>
                <p className="text-xs mt-2 opacity-60">Use the controls on the left to customize</p>
              </div>
            )}

            {/* Generating Overlay */}
            {isGenerating && (
              <div className="absolute inset-0 glass-overlay z-30 flex flex-col items-center justify-center">
                <div className="scan-line"></div>
                <Loader2 className="animate-spin text-[#EF8354] mb-4" size={40} />
                <div className="bg-white/80 backdrop-blur-md px-6 py-2 rounded-full shadow-lg border border-white font-semibold text-zinc-700 text-sm animate-pulse">
                  Synthesizing {aspectRatio.label} Image...
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Backdrop */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Left Sidebar - Parameters */}
        <aside
          className={`absolute top-20 bottom-44 md:top-24 md:bottom-24 left-4 md:left-6 w-[320px] md:w-[340px] glass-panel rounded-[28px] p-5 md:p-6 z-50 flex flex-col gap-6 custom-scrollbar overflow-y-auto transition-transform duration-300 ease-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-[120%] md:translate-x-0'
            }`}
        >
          <header className="flex items-center justify-between pb-2 shrink-0">
            <h2 className="text-lg font-bold text-zinc-800">Parameters</h2>
            <button
              className="text-zinc-400 hover:text-zinc-600 md:hidden"
              onClick={() => setIsSidebarOpen(false)}
            >
              <ChevronsLeft size={20} />
            </button>
          </header>

          {/* Reference Image */}
          <section className="space-y-3 shrink-0">
            <div className="flex justify-between items-center">
              <label className="text-sm font-semibold text-zinc-700">Reference Image</label>
              {referenceImage ? (
                <button
                  onClick={() => setReferenceImage(null)}
                  className="text-[11px] font-bold text-red-400 hover:text-red-500 uppercase tracking-wider flex items-center gap-1"
                >
                  <Trash2 size={12} /> Clear
                </button>
              ) : (
                <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">Optional</span>
              )}
            </div>

            <div
              className="w-full aspect-[4/2.5] rounded-2xl border-2 border-dashed border-zinc-200 bg-white/40 flex flex-col items-center justify-center cursor-pointer hover:border-[#EF8354]/50 hover:bg-white/60 transition-all group relative overflow-hidden"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*"
                className="hidden"
              />

              {referenceImage ? (
                <img src={referenceImage} alt="Reference" className="w-full h-full object-cover" />
              ) : (
                <>
                  <div className="w-10 h-10 rounded-xl bg-[#EF8354]/10 flex items-center justify-center text-[#EF8354] mb-3 group-hover:scale-110 transition-transform">
                    <ImagePlus size={20} />
                  </div>
                  <span className="text-sm font-semibold text-zinc-700">Drop image here</span>
                  <span className="text-xs text-zinc-400 mt-1">or click to browse</span>
                </>
              )}
            </div>
          </section>

          {/* Aspect Ratio */}
          <section className="space-y-3 shrink-0">
            <label className="text-sm font-semibold text-zinc-700 flex justify-between">
              Aspect Ratio <span className="text-[#EF8354] font-bold">{aspectRatio.label}</span>
            </label>
            <div className="bg-zinc-100/80 p-1.5 rounded-2xl flex items-center gap-1 border border-zinc-200/50 overflow-x-auto custom-scrollbar">
              {ASPECT_RATIOS.map((ratio) => (
                <button
                  key={ratio.id}
                  onClick={() => setAspectRatio(ratio)}
                  className={`flex-1 min-w-[60px] flex flex-col justify-center items-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${aspectRatio.id === ratio.id
                      ? 'bg-white shadow-sm text-[#EF8354] border border-[#EF8354]/20'
                      : 'text-zinc-500 hover:text-zinc-700 hover:bg-white/50'
                    }`}
                >
                  <div className={ratio.shapeClass}></div>
                  <span>{ratio.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Model Selection */}
          <section className="space-y-3 shrink-0">
            <label className="text-sm font-semibold text-zinc-700">AI Model</label>
            <div className="relative">
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full appearance-none bg-zinc-100/80 border border-zinc-200/50 rounded-xl py-3 px-4 text-sm font-semibold text-zinc-700 focus:outline-none focus:ring-2 focus:ring-[#EF8354]/20 cursor-pointer"
              >
                <option value="flux">Flux Schnell</option>
                <option value="zimage">Z-Image Turbo</option>
                <option value="gptimage">GPT Image 1.5</option>
                <option value="nanobanana">NanoBanana</option>
                <option value="seedream5">Seedream 5</option>
                <option value="klein">FLUX.2 Klein</option>
                <option value="grok-imagine">Grok Imagine</option>
              </select>
              <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
            </div>
          </section>

          {/* Style Presets */}
          <section className="space-y-3 shrink-0">
            <label className="text-sm font-semibold text-zinc-700">Style Preset</label>
            <div className="flex flex-wrap gap-2">
              {PRESET_STYLES.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => applyPreset(preset.name)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${selectedPreset === preset.name
                      ? 'bg-[#EF8354] text-white shadow-md'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                    }`}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </section>

          {/* Sliders */}
          <section className="space-y-6 pt-2 shrink-0">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-sm font-semibold text-zinc-700">Style Strength</label>
                <span className="text-xs font-bold text-[#EF8354] bg-[#EF8354]/10 border border-[#EF8354]/20 px-2 py-1 rounded-md">
                  {styleStrength}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={styleStrength}
                onChange={(e) => setStyleStrength(parseInt(e.target.value))}
              />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-sm font-semibold text-zinc-700">Guidance Scale</label>
                <span className="text-xs font-bold text-zinc-600 bg-zinc-100 border border-zinc-200 px-2 py-1 rounded-md">
                  {guidanceScale.toFixed(1)}
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="20"
                step="0.1"
                value={guidanceScale}
                onChange={(e) => setGuidanceScale(parseFloat(e.target.value))}
              />
            </div>
          </section>

          {/* Advanced Settings */}
          <section className="pt-4 border-t border-zinc-200/50 mt-auto shrink-0">
            <button
              className="flex items-center justify-between w-full text-zinc-500 hover:text-zinc-800 transition-colors py-2"
              onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
            >
              <div className="flex items-center gap-2">
                <SlidersHorizontal size={16} />
                <span className="text-sm font-semibold">Advanced Settings</span>
              </div>
              <ChevronDown
                size={16}
                className={`transition-transform duration-300 ${isAdvancedOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {isAdvancedOpen && (
              <div className="space-y-5 pb-2 mt-4">
                <div className="flex items-center justify-between gap-4">
                  <label className="text-xs font-semibold text-zinc-600 shrink-0">Seed</label>
                  <input
                    type="number"
                    value={seed}
                    onChange={(e) => setSeed(parseInt(e.target.value) || -1)}
                    className="flex-1 bg-zinc-100/80 rounded-lg px-3 py-1.5 border border-zinc-200/50 text-xs font-semibold text-zinc-700 focus:outline-none"
                  />
                </div>
                <div className="flex items-center justify-between gap-4">
                  <label className="text-xs font-semibold text-zinc-600 shrink-0">Steps</label>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={steps}
                    onChange={(e) => setSteps(parseInt(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-xs font-bold text-zinc-600 w-6 text-right">{steps}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <label className="text-xs font-semibold text-zinc-600 shrink-0">Negative Prompt</label>
                  <input
                    type="text"
                    value={negativePrompt}
                    onChange={(e) => setNegativePrompt(e.target.value)}
                    placeholder="What to exclude..."
                    className="flex-1 bg-zinc-100/80 rounded-lg px-3 py-1.5 border border-zinc-200/50 text-xs text-zinc-700 focus:outline-none"
                  />
                </div>
              </div>
            )}
          </section>
        </aside>

        {/* Bottom Panel - Prompt & Generate */}
        <div className="absolute bottom-4 md:bottom-6 left-4 right-4 md:left-[380px] md:right-24 glass-panel rounded-[24px] md:rounded-3xl p-3 md:p-5 z-40 flex flex-col gap-3 md:gap-4 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.15)] max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row items-stretch md:items-start gap-3 md:gap-4">
            <div className="flex-1 relative bg-white/40 md:bg-transparent rounded-2xl md:rounded-none p-3 md:p-0">
              <textarea
                className="w-full bg-transparent resize-none text-zinc-700 text-sm md:text-base leading-relaxed focus:outline-none placeholder:text-zinc-400 h-20 md:h-16 prompt-scrollbar"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe what you want to see..."
              />
            </div>

            <button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              className={`text-white px-6 py-4 rounded-2xl font-bold text-sm md:text-base flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 shrink-0 h-[60px] md:h-16 ${isGenerating || !prompt.trim()
                  ? 'bg-zinc-400 shadow-none cursor-not-allowed'
                  : 'bg-[#EF8354] hover:bg-[#e27344] shadow-[#EF8354]/25 hover:shadow-xl hover:shadow-[#EF8354]/30'
                }`}
            >
              {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
              {isGenerating ? 'Synthesizing...' : 'Generate'}
            </button>
          </div>

          {/* Modifiers */}
          <div className="flex items-center justify-between pt-2 border-t border-zinc-200/50">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-1 custom-scrollbar w-full md:w-auto">
              <span className="text-xs font-semibold text-zinc-400 mr-1 md:mr-2 uppercase tracking-wide shrink-0">
                Modifiers:
              </span>
              {ALL_MODIFIERS.map((mod) => {
                const isActive = activeModifiers.includes(mod);
                return (
                  <button
                    key={mod}
                    onClick={() => toggleModifier(mod)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm whitespace-nowrap transition-colors border shrink-0 ${isActive
                        ? 'bg-[#EF8354]/10 text-[#EF8354] border-[#EF8354]/30'
                        : 'bg-white text-zinc-600 border-zinc-200 hover:border-[#EF8354]/50'
                      }`}
                  >
                    {isActive && <Check size={12} strokeWidth={3} />}
                    {mod}
                  </button>
                );
              })}
            </div>

            {generatedImage && (
              <div className="flex items-center gap-2 pl-4 border-l border-zinc-200 ml-2 shrink-0">
                <button
                  onClick={downloadImage}
                  className="flex items-center gap-1.5 text-xs font-bold text-zinc-400 hover:text-[#EF8354] transition-colors whitespace-nowrap"
                >
                  <Download size={14} />
                  Save
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
