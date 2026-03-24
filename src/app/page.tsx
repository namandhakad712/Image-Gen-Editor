'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  LayoutGrid, Settings, MousePointer2, Hand, PenLine,
  ImagePlus, ChevronDown, ChevronsLeft, Sparkles, Plus,
  SlidersHorizontal, Menu, X, Loader2, Trash2, Check,
  Eye, EyeOff, Download, LogIn, Key, ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import { pollinationsAPI } from '@/lib/api';
import { storage, generateId, formatDate } from '@/lib/utils';
import { HistoryItem, GenerationParams } from '@/types';

// =============================================
//  CONSTANTS (matching ui-design.tsx exactly)
// =============================================

const ASPECT_RATIOS = [
  { id: '1:1', label: '1:1', shapeClass: 'shape-1-1', cssRatio: '1/1', width: 1024, height: 1024 },
  { id: '4:3', label: '4:3', shapeClass: 'shape-4-3', cssRatio: '4/3', width: 1024, height: 768 },
  { id: '16:9', label: '16:9', shapeClass: 'shape-16-9', cssRatio: '16/9', width: 1280, height: 720 },
  { id: '21:9', label: '21:9', shapeClass: 'shape-21-9', cssRatio: '21/9', width: 1512, height: 648 },
  { id: '3:4', label: '3:4', shapeClass: 'shape-3-4', cssRatio: '3/4', width: 768, height: 1024 },
  { id: '9:16', label: '9:16', shapeClass: 'shape-9-16', cssRatio: '9/16', width: 720, height: 1280 },
];

const ALL_MODIFIERS = [
  'High Resolution', 'Studio Lighting', 'Minimalist', 'Cinematic',
  'Octane Render', 'Volumetric', 'Macro',
];

const MODELS = [
  { value: 'flux', label: 'Flux Schnell' },
  { value: 'zimage', label: 'Z-Image Turbo' },
  { value: 'gptimage', label: 'GPT Image 1 Mini' },
  { value: 'nanobanana', label: 'NanoBanana' },
  { value: 'klein', label: 'FLUX.2 Klein 4B' },
  { value: 'kontext', label: 'FLUX.1 Kontext' },
  { value: 'gptimage-large', label: 'GPT Image 1.5' },
  { value: 'seedream5', label: 'Seedream 5.0 Lite' },
];

// BYOP App URL for redirect auth
const APP_REDIRECT_URL = typeof window !== 'undefined' ? window.location.origin : 'https://image-gen-editor.vercel.app';
const BYOP_AUTH_URL = 'https://enter.pollinations.ai/authorize';

// =============================================
//  MAIN COMPONENT  — EXACT UI from ui-design.tsx
// =============================================

export default function SpatialImageEditor() {
  // Mobile / UI State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [activeTool, setActiveTool] = useState<'pointer' | 'hand' | 'pen'>('pointer');
  const [showOverlay, setShowOverlay] = useState<'none' | 'gallery' | 'settings'>('none');

  // Generation State
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');

  // Parameters
  const [aspectRatio, setAspectRatio] = useState(ASPECT_RATIOS[2]); // Default 16:9
  const [styleStrength, setStyleStrength] = useState(75);
  const [guidanceScale, setGuidanceScale] = useState(7.5);
  const [seed, setSeed] = useState(-1);
  const [steps, setSteps] = useState(30);
  const [activeModifiers, setActiveModifiers] = useState<string[]>(['High Resolution', 'Studio Lighting', 'Minimalist']);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState('flux');
  const [enhance, setEnhance] = useState(true);
  const [safe, setSafe] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null);

  // =============================================
  //  BYOP: Grab API key from URL hash on redirect
  // =============================================
  useEffect(() => {
    // Check if we received an API key from BYOP redirect
    if (typeof window !== 'undefined' && window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.slice(1));
      const apiKey = hashParams.get('api_key');
      if (apiKey) {
        storage.setApiKey(apiKey);
        setHasApiKey(true);
        pollinationsAPI.setApiKey(apiKey);
        toast.success('Connected! API key received via Pollinations');
        // Clean the hash from URL
        window.history.replaceState(null, '', window.location.pathname);
      }
    }
    // Also check localStorage
    const savedKey = storage.getApiKey();
    if (savedKey) {
      setHasApiKey(true);
      pollinationsAPI.setApiKey(savedKey);
    }
  }, []);

  // =============================================
  //  HANDLERS
  // =============================================

  // BYOP redirect auth
  const handleBYOPAuth = () => {
    const params = new URLSearchParams({
      redirect_url: APP_REDIRECT_URL,
    });
    window.location.href = `${BYOP_AUTH_URL}?${params}`;
  };

  // Generate Image via Pollinations API
  const handleGenerate = async () => {
    if (isGenerating) return;
    if (!prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    if (!hasApiKey) {
      toast.error('Please connect your Pollinations account or add an API key');
      setShowOverlay('settings');
      return;
    }

    setIsGenerating(true);

    try {
      const actualSeed = seed === -1 ? Math.floor(Math.random() * 999999999) : seed;
      const fullPrompt = activeModifiers.length > 0
        ? `${prompt}, ${activeModifiers.join(', ')}`
        : prompt;

      const params: GenerationParams = {
        model: selectedModel,
        prompt: fullPrompt,
        width: aspectRatio.width,
        height: aspectRatio.height,
        seed: actualSeed,
        enhance,
        safe,
        quality: 'high' as const,
        image: referenceImage || undefined,
      };

      let imageUrl: string;

      if (referenceImage) {
        // Use OpenAI-compatible endpoint for image-to-image
        imageUrl = await pollinationsAPI.generateImageOpenAI({
          prompt: fullPrompt,
          model: selectedModel,
          seed: actualSeed,
          enhance,
          safe,
        });
      } else {
        imageUrl = await pollinationsAPI.generateImage(params);
      }

      setCurrentImageUrl(imageUrl);
      setSeed(actualSeed);

      // Save to history (stored in localStorage)
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
      storage.setHistory([historyItem, ...history].slice(0, 50));

      toast.success('Image generated!');
      setReferenceImage(null);

      if (window.innerWidth < 768) setIsSidebarOpen(false);
    } catch (error) {
      console.error('Generation error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate image');
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle File Upload for Reference Image
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
    setActiveModifiers(prev =>
      prev.includes(mod) ? prev.filter(m => m !== mod) : [...prev, mod]
    );
  };

  // Download current image
  const downloadImage = async () => {
    if (!currentImageUrl) return;
    try {
      const response = await fetch(currentImageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `image-gen-${Date.now()}.png`;
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success('Image downloaded!');
    } catch {
      toast.error('Failed to download');
    }
  };

  // Load from gallery
  const loadFromGallery = (item: HistoryItem) => {
    setCurrentImageUrl(item.imageUrl);
    setShowOverlay('none');
    toast.success('Loaded from gallery');
  };

  // =============================================
  //  DRAWING LOGIC (pen tool on canvas overlay)
  // =============================================
  useEffect(() => {
    if (activeTool !== 'pen' || !drawingCanvasRef.current) return;

    const canvas = drawingCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let isDrawing = false;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    ctx.strokeStyle = '#EF8354';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';

    const getCoords = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0]?.clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0]?.clientY : e.clientY;
      return { x: (clientX || 0) - rect.left, y: (clientY || 0) - rect.top };
    };

    const startDrawing = (e: MouseEvent | TouchEvent) => {
      isDrawing = true;
      const { x, y } = getCoords(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
    };
    const stopDrawing = () => {
      isDrawing = false;
      ctx.beginPath();
    };
    const draw = (e: MouseEvent | TouchEvent) => {
      if (!isDrawing) return;
      const { x, y } = getCoords(e);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y);
    };

    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);
    canvas.addEventListener('touchstart', startDrawing);
    canvas.addEventListener('touchmove', draw);
    canvas.addEventListener('touchend', stopDrawing);

    return () => {
      canvas.removeEventListener('mousedown', startDrawing);
      canvas.removeEventListener('mousemove', draw);
      canvas.removeEventListener('mouseup', stopDrawing);
      canvas.removeEventListener('mouseout', stopDrawing);
      canvas.removeEventListener('touchstart', startDrawing);
      canvas.removeEventListener('touchmove', draw);
      canvas.removeEventListener('touchend', stopDrawing);
    };
  }, [activeTool, currentImageUrl, aspectRatio]);

  // =============================================
  //  RENDER  — Exact replica of ui-design.tsx
  // =============================================
  return (
    <div className="w-full h-[100dvh] bg-[#18181a] dark-dots p-2 md:p-6 lg:p-8 flex items-center justify-center selection:bg-[#EF8354] selection:text-white relative">

      {/* Outer Browser/App Window Shell */}
      <div className="w-full h-full max-w-[1600px] rounded-[24px] md:rounded-[32px] overflow-hidden light-grid shadow-2xl ring-1 ring-white/10 relative flex flex-col items-center justify-center">

        {/* =========================================
            TOP NAVIGATION LAYER
        ========================================= */}
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
              onClick={() => setShowOverlay(showOverlay === 'gallery' ? 'none' : 'gallery')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors font-medium text-sm ${showOverlay === 'gallery' ? 'bg-[#EF8354]/10 text-[#EF8354]' : 'text-zinc-700 hover:bg-black/5'}`}
            >
              <LayoutGrid size={16} />
              <span className="hidden sm:inline">Gallery</span>
            </button>
            <div className="w-px h-4 bg-zinc-200 mx-2"></div>
            <button
              onClick={() => setShowOverlay(showOverlay === 'settings' ? 'none' : 'settings')}
              className={`p-1.5 rounded-full transition-colors ${showOverlay === 'settings' ? 'bg-[#EF8354]/10 text-[#EF8354]' : 'text-zinc-500 hover:bg-black/5'}`}
            >
              <Settings size={16} />
            </button>
          </div>
        </div>

        {/* Floating Right Tools */}
        <div className="absolute top-4 right-4 md:top-6 md:right-6 z-40">
          <div className="glass-pill rounded-full flex flex-row md:flex-col items-center p-1.5 md:p-2 gap-1 md:gap-2">
            <button
              onClick={() => setActiveTool('pointer')}
              className={`p-2 rounded-full transition-colors ${activeTool === 'pointer' ? 'bg-[#EF8354]/10 text-[#EF8354]' : 'text-zinc-500 hover:text-black hover:bg-black/5'}`}
            >
              <MousePointer2 size={18} />
            </button>
            <button
              onClick={() => setActiveTool('hand')}
              className={`p-2 rounded-full transition-colors ${activeTool === 'hand' ? 'bg-[#EF8354]/10 text-[#EF8354]' : 'text-zinc-500 hover:text-black hover:bg-black/5'}`}
            >
              <Hand size={18} />
            </button>
            <button
              onClick={() => setActiveTool('pen')}
              className={`p-2 rounded-full transition-colors ${activeTool === 'pen' ? 'bg-[#EF8354]/10 text-[#EF8354]' : 'text-zinc-500 hover:text-black hover:bg-black/5'}`}
            >
              <PenLine size={18} />
            </button>
            {currentImageUrl && (
              <>
                <div className="w-6 h-px md:w-px md:h-6 bg-zinc-200"></div>
                <button
                  onClick={downloadImage}
                  className="p-2 rounded-full text-zinc-500 hover:text-black hover:bg-black/5 transition-colors"
                  title="Download"
                >
                  <Download size={18} />
                </button>
              </>
            )}
          </div>
        </div>


        {/* =========================================
            CENTRAL CANVAS WORKSPACE
        ========================================= */}
        <div className="absolute inset-0 flex items-center justify-center p-4 pt-20 pb-48 md:pb-32 md:pl-[380px] md:pr-24 z-0">
          {/* Dynamic Aspect Ratio Container */}
          <div
            className={`relative w-full max-h-full rounded-2xl md:rounded-3xl shadow-2xl transition-all duration-500 ease-in-out flex items-center justify-center overflow-hidden bg-white ${activeTool === 'hand' ? 'cursor-grab active:cursor-grabbing' : activeTool === 'pen' ? 'cursor-crosshair' : 'cursor-default'}`}
            style={{
              aspectRatio: aspectRatio.cssRatio,
              maxWidth: '100%',
              border: '1px solid rgba(0,0,0,0.05)'
            }}
          >
            {currentImageUrl ? (
              <img
                src={currentImageUrl}
                alt="Generated Canvas"
                className={`w-full h-full object-cover transition-all duration-700 ${isGenerating ? 'scale-105 blur-md' : 'scale-100 blur-0'}`}
                style={{ filter: 'contrast(1.1) brightness(0.9)' }}
              />
            ) : (
              /* Empty state — matching the design spirit */
              <div className="flex flex-col items-center justify-center text-center p-8 select-none">
                <div className="w-16 h-16 rounded-2xl bg-[#EF8354]/10 flex items-center justify-center text-[#EF8354] mb-4">
                  <Sparkles size={28} />
                </div>
                <h2 className="text-lg font-bold text-zinc-700 mb-1">Start Creating</h2>
                <p className="text-sm text-zinc-400 max-w-[280px]">Enter a prompt below and click Generate to create images</p>
              </div>
            )}

            {/* Drawing Canvas Overlay */}
            {activeTool === 'pen' && !isGenerating && (
              <canvas
                ref={drawingCanvasRef}
                className="absolute inset-0 w-full h-full z-20 touch-none"
              />
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


        {/* =========================================
            LEFT PANEL: PARAMETERS
        ========================================= */}
        {isSidebarOpen && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden" onClick={() => setIsSidebarOpen(false)} />
        )}

        <aside className={`absolute top-20 bottom-44 md:top-24 md:bottom-24 left-4 md:left-6 w-[320px] md:w-[340px] glass-panel rounded-[28px] p-5 md:p-6 z-50 flex flex-col gap-6 custom-scrollbar overflow-y-auto transition-transform duration-300 ease-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-[120%] md:translate-x-0'}`}>

          <header className="flex items-center justify-between pb-2 shrink-0">
            <h2 className="text-lg font-bold text-zinc-800">Parameters</h2>
            <button className="text-zinc-400 hover:text-zinc-600 md:hidden" onClick={() => setIsSidebarOpen(false)}>
              <ChevronsLeft size={20} />
            </button>
          </header>

          {/* Reference Image Zone */}
          <section className="space-y-3 shrink-0">
            <div className="flex justify-between items-center">
              <label className="text-sm font-semibold text-zinc-700">Reference Image</label>
              {referenceImage ? (
                <button onClick={() => setReferenceImage(null)} className="text-[11px] font-bold text-red-400 hover:text-red-500 uppercase tracking-wider flex items-center gap-1">
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
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />

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

          {/* Aspect Ratio (Scrollable Row) */}
          <section className="space-y-3 shrink-0">
            <label className="text-sm font-semibold text-zinc-700 flex justify-between">
              Aspect Ratio <span className="text-[#EF8354] font-bold">{aspectRatio.label}</span>
            </label>
            <div className="bg-zinc-100/80 p-1.5 rounded-2xl flex items-center gap-1 border border-zinc-200/50 overflow-x-auto custom-scrollbar">
              {ASPECT_RATIOS.map((ratio) => (
                <button
                  key={ratio.id}
                  onClick={() => setAspectRatio(ratio)}
                  className={`flex-1 min-w-[60px] flex flex-col justify-center items-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${aspectRatio.id === ratio.id ? 'bg-white shadow-sm text-[#EF8354] border border-[#EF8354]/20' : 'text-zinc-500 hover:text-zinc-700 hover:bg-white/50'}`}
                >
                  <div className={`${ratio.shapeClass}`}></div>
                  <span>{ratio.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Model Selection */}
          <section className="space-y-3 shrink-0">
            <label className="text-sm font-semibold text-zinc-700">Model</label>
            <div className="relative">
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full appearance-none bg-zinc-100/80 border border-zinc-200/50 rounded-xl py-3 px-4 text-sm font-semibold text-zinc-700 focus:outline-none focus:ring-2 focus:ring-[#EF8354]/20 cursor-pointer"
              >
                {MODELS.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
            </div>
          </section>

          {/* Sliders */}
          <section className="space-y-6 pt-2 shrink-0">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-sm font-semibold text-zinc-700">Style Strength</label>
                <span className="text-xs font-bold text-[#EF8354] bg-[#EF8354]/10 border border-[#EF8354]/20 px-2 py-1 rounded-md">{styleStrength}%</span>
              </div>
              <div className="relative pt-2">
                <input type="range" min="0" max="100" value={styleStrength} onChange={(e) => setStyleStrength(parseInt(e.target.value))} />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-sm font-semibold text-zinc-700">Guidance Scale</label>
                <span className="text-xs font-bold text-zinc-600 bg-zinc-100 border border-zinc-200 px-2 py-1 rounded-md">{guidanceScale.toFixed(1)}</span>
              </div>
              <div className="relative pt-2">
                <input type="range" min="1" max="20" step="0.1" value={guidanceScale} onChange={(e) => setGuidanceScale(parseFloat(e.target.value))} />
              </div>
            </div>
          </section>

          {/* Toggle Switches */}
          <section className="space-y-4 shrink-0">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-zinc-700">Enhance Prompt</label>
              <div className={`toggle-switch ${enhance ? 'active' : ''}`} onClick={() => setEnhance(!enhance)} />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-zinc-700">Safe Mode</label>
              <div className={`toggle-switch ${safe ? 'active' : ''}`} onClick={() => setSafe(!safe)} />
            </div>
          </section>

          {/* Advanced Settings Accordion */}
          <section className="pt-4 border-t border-zinc-200/50 mt-auto shrink-0">
            <button
              className="flex items-center justify-between w-full text-zinc-500 hover:text-zinc-800 transition-colors py-2"
              onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
            >
              <div className="flex items-center gap-2">
                <SlidersHorizontal size={16} />
                <span className="text-sm font-semibold">Advanced Settings</span>
              </div>
              <ChevronDown size={16} className={`transition-transform duration-300 ${isAdvancedOpen ? 'rotate-180' : ''}`} />
            </button>

            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isAdvancedOpen ? 'max-h-[200px] opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
              <div className="space-y-5 pb-2">
                <div className="flex items-center justify-between gap-4">
                  <label className="text-xs font-semibold text-zinc-600 shrink-0">Seed</label>
                  <div className="flex flex-1 items-center bg-zinc-100/80 rounded-lg px-3 py-1.5 border border-zinc-200/50">
                    <input
                      type="number"
                      value={seed}
                      onChange={(e) => setSeed(Number(e.target.value))}
                      className="w-full bg-transparent text-xs font-mono text-zinc-700 focus:outline-none"
                      placeholder="-1 for random"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <label className="text-xs font-semibold text-zinc-600 shrink-0">Steps</label>
                  <input type="range" min="1" max="100" value={steps} onChange={(e) => setSteps(parseInt(e.target.value))} className="flex-1" />
                  <span className="text-xs font-bold text-zinc-600 w-6 text-right">{steps}</span>
                </div>
              </div>
            </div>
          </section>

        </aside>


        {/* =========================================
            BOTTOM PANEL: PROMPT & GENERATE
        ========================================= */}
        <div className="absolute bottom-4 md:bottom-6 left-4 right-4 md:left-[380px] md:right-24 glass-panel rounded-[24px] md:rounded-3xl p-3 md:p-5 z-40 flex flex-col gap-3 md:gap-4 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.15)] max-w-4xl mx-auto">

          <div className="flex flex-col md:flex-row items-stretch md:items-start gap-3 md:gap-4">
            {/* Prompt Textarea */}
            <div className="flex-1 relative bg-white/40 md:bg-transparent rounded-2xl md:rounded-none p-3 md:p-0">
              <textarea
                className="w-full bg-transparent resize-none text-zinc-700 text-sm md:text-base leading-relaxed focus:outline-none placeholder:text-zinc-400 h-20 md:h-16 prompt-scrollbar"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe what you want to see..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleGenerate();
                  }
                }}
              />
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className={`text-white px-6 py-4 rounded-2xl font-bold text-sm md:text-base flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 shrink-0 h-[60px] md:h-16
                ${isGenerating
                  ? 'bg-zinc-400 shadow-none cursor-not-allowed'
                  : 'bg-[#EF8354] hover:bg-[#e27344] shadow-[#EF8354]/25 hover:shadow-xl hover:shadow-[#EF8354]/30'
                }`}
            >
              {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
              {isGenerating ? 'Synthesizing...' : 'Generate'}
            </button>
          </div>

          {/* Bottom Modifiers Row */}
          <div className="flex items-center justify-between pt-2 border-t border-zinc-200/50">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-1 custom-scrollbar w-full md:w-auto">
              <span className="text-xs font-semibold text-zinc-400 mr-1 md:mr-2 uppercase tracking-wide shrink-0">Modifiers:</span>
              {ALL_MODIFIERS.map((mod) => {
                const isActive = activeModifiers.includes(mod);
                return (
                  <button
                    key={mod}
                    onClick={() => toggleModifier(mod)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm whitespace-nowrap transition-colors border shrink-0
                      ${isActive
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

            <button className="hidden md:flex items-center gap-1.5 text-xs font-bold text-zinc-400 hover:text-[#EF8354] transition-colors whitespace-nowrap pl-4 shrink-0 border-l border-zinc-200 ml-2">
              <Plus size={14} />
              Custom
            </button>
          </div>

        </div>


        {/* =========================================
            GALLERY OVERLAY
        ========================================= */}
        {showOverlay === 'gallery' && (
          <>
            <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[60]" onClick={() => setShowOverlay('none')} />
            <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[70] w-[90vw] max-w-2xl animate-fade-in">
              <div className="glass-panel rounded-3xl p-6 border border-white/50 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-bold text-zinc-800 text-lg">Gallery</h3>
                  <button onClick={() => setShowOverlay('none')} className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-700 hover:bg-black/5 transition-colors">
                    <X size={18} />
                  </button>
                </div>
                <GalleryGrid onLoad={loadFromGallery} />
              </div>
            </div>
          </>
        )}


        {/* =========================================
            SETTINGS OVERLAY (BYOP + Manual Key)
        ========================================= */}
        {showOverlay === 'settings' && (
          <>
            <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[60]" onClick={() => setShowOverlay('none')} />
            <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[70] w-[90vw] max-w-md animate-fade-in">
              <div className="glass-panel rounded-3xl p-6 border border-white/50">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-bold text-zinc-800 text-lg">Settings</h3>
                  <button onClick={() => setShowOverlay('none')} className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-700 hover:bg-black/5 transition-colors">
                    <X size={18} />
                  </button>
                </div>

                <div className="space-y-5">
                  {/* BYOP: One-click Connect */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
                      <LogIn size={14} /> Connect with Pollinations
                    </label>
                    <p className="text-xs text-zinc-400">Sign in to connect your Pollinations account. Your pollen, your usage.</p>
                    <button
                      onClick={handleBYOPAuth}
                      className="w-full py-3 rounded-xl font-bold text-sm text-white bg-[#EF8354] hover:bg-[#e27344] shadow-lg shadow-[#EF8354]/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                      <ExternalLink size={16} />
                      Connect via Pollinations
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-zinc-200"></div>
                    <span className="text-xs font-semibold text-zinc-400 uppercase">or</span>
                    <div className="flex-1 h-px bg-zinc-200"></div>
                  </div>

                  {/* Manual API Key */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
                      <Key size={14} /> Manual API Key
                    </label>
                    <ApiKeyInput onSave={() => {
                      setHasApiKey(true);
                      const key = storage.getApiKey();
                      if (key) pollinationsAPI.setApiKey(key);
                    }} />
                  </div>

                  {/* Connection status */}
                  {hasApiKey && (
                    <div className="flex items-center gap-2 py-2 px-3 rounded-xl bg-green-50 border border-green-200">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <span className="text-xs font-semibold text-green-700">Connected</span>
                    </div>
                  )}

                  <div className="pt-3 border-t border-zinc-200/50">
                    <p className="text-xs text-zinc-500">
                      Get your free API key at{' '}
                      <a href="https://enter.pollinations.ai" target="_blank" rel="noopener noreferrer" className="text-[#EF8354] hover:underline font-medium">
                        enter.pollinations.ai
                      </a>
                    </p>
                    <p className="text-[10px] text-zinc-400 mt-1">
                      Images are generated via Pollinations API and served from their CDN. History is saved in your browser&apos;s localStorage.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
}


// =============================================
//  GALLERY GRID COMPONENT
// =============================================
function GalleryGrid({ onLoad }: { onLoad: (item: HistoryItem) => void }) {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    setHistory(storage.getHistory());
  }, []);

  if (history.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-12 h-12 rounded-xl bg-zinc-100 flex items-center justify-center mx-auto mb-3">
          <Sparkles className="text-zinc-400" size={20} />
        </div>
        <p className="text-sm text-zinc-500 font-medium">No images yet</p>
        <p className="text-xs text-zinc-400 mt-1">Generated images will appear here</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {history.map((item) => (
        <div
          key={item.id}
          className="aspect-square rounded-2xl overflow-hidden cursor-pointer group relative bg-zinc-100 hover:ring-2 hover:ring-[#EF8354]/50 transition-all"
          onClick={() => onLoad(item)}
        >
          <img src={item.imageUrl} alt={item.prompt} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-2">
            <span className="text-xs text-white font-semibold mb-1">Load to Canvas</span>
            <span className="text-[10px] text-white/70 line-clamp-2 text-center">{item.prompt}</span>
          </div>
        </div>
      ))}
    </div>
  );
}


// =============================================
//  API KEY INPUT COMPONENT
// =============================================
function ApiKeyInput({ onSave }: { onSave: () => void }) {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const key = storage.getApiKey();
    if (key) setApiKey(key);
  }, []);

  const handleSave = () => {
    if (!apiKey.trim()) {
      toast.error('Please enter an API key');
      return;
    }
    storage.setApiKey(apiKey.trim());
    setSaved(true);
    onSave();
    toast.success('API key saved');
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-2.5">
      <div className="flex gap-2">
        <div className="flex-1 flex items-center bg-zinc-100/80 rounded-xl px-3 py-2 border border-zinc-200/50">
          <input
            type={showKey ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk_..."
            className="w-full bg-transparent text-sm text-zinc-700 placeholder:text-zinc-400 focus:outline-none font-mono"
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
          />
        </div>
        <button
          onClick={() => setShowKey(!showKey)}
          className="p-2.5 rounded-xl border border-zinc-200/50 text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
        >
          {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      <button
        onClick={handleSave}
        className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all ${saved
          ? 'bg-green-500 text-white'
          : 'bg-zinc-800 text-white hover:bg-zinc-700'
          }`}
      >
        {saved ? (
          <span className="flex items-center justify-center gap-1.5"><Check size={14} /> Saved!</span>
        ) : (
          'Save API Key'
        )}
      </button>
    </div>
  );
}
