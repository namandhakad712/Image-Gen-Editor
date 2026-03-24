'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  LayoutGrid, Settings, MousePointer2, Hand, PenLine,
  ImagePlus, ChevronDown, ChevronsLeft, Sparkles, Plus,
  SlidersHorizontal, Menu, X, Loader2, Trash2, Check,
  Eye, EyeOff, Download, LogIn, Key, ExternalLink,
  History, Image, Wand2, ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import { pollinationsAPI } from '@/lib/api';
import { storage, generateId, formatDate } from '@/lib/utils';
import { HistoryItem, GenerationParams } from '@/types';

// =============================================
//  CONSTANTS
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

const DEFAULT_MODELS = [
  { value: 'flux', label: 'Flux Schnell' },
  { value: 'zimage', label: 'Z-Image Turbo' },
  { value: 'gptimage', label: 'GPT Image 1 Mini' },
  { value: 'nanobanana', label: 'NanoBanana' },
  { value: 'klein', label: 'FLUX.2 Klein 4B' },
  { value: 'kontext', label: 'FLUX.1 Kontext' },
  { value: 'gptimage-large', label: 'GPT Image 1.5' },
  { value: 'seedream5', label: 'Seedream 5.0 Lite' },
];

const APP_REDIRECT_URL = typeof window !== 'undefined' ? window.location.origin : 'https://image-gen-editor.vercel.app';
const BYOP_AUTH_URL = 'https://enter.pollinations.ai/authorize';

// =============================================
//  MAIN COMPONENT
// =============================================
export default function SpatialImageEditor() {
  // UI State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [activeTool, setActiveTool] = useState<'pointer' | 'hand' | 'pen'>('pointer');
  const [menuOpen, setMenuOpen] = useState(false);

  // Generation State
  const [isGenerating, setIsGenerating] = useState(false);
  const [prompt, setPrompt] = useState('');

  // Canvas State - infinite canvas with multiple images
  const [canvasImages, setCanvasImages] = useState<Array<{
    id: string; url: string; x: number; y: number; width: number; height: number; prompt: string;
  }>>([]);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Parameters
  const [aspectRatio, setAspectRatio] = useState(ASPECT_RATIOS[5]);
  const [styleStrength, setStyleStrength] = useState(75);
  const [guidanceScale, setGuidanceScale] = useState(7.5);
  const [seed, setSeed] = useState(-1);
  const [steps, setSteps] = useState(30);
  const [activeModifiers, setActiveModifiers] = useState<string[]>([]);
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState('flux');
  const [penColor, setPenColor] = useState('#EF8354');
  const [enhance, setEnhance] = useState(true);
  const [safe, setSafe] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [models, setModels] = useState(DEFAULT_MODELS);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // =============================================
  //  Live Models Fetch
  // =============================================
  useEffect(() => {
    fetch('https://image.pollinations.ai/models')
      .then(res => res.json())
      .then((data: any[]) => {
        const imageModels = data.filter(m => m.type === 'image' || 
          (m.output_modalities && (m.output_modalities.includes('image') || m.output_modalities.includes('video')))
        );
        if (imageModels.length > 0) {
          setModels(imageModels.map(m => ({ value: m.name, label: m.description || m.name })));
        }
      }).catch(err => console.error('Failed to fetch models:', err));
  }, []);

  // =============================================
  //  BYOP: Grab API key from URL hash on load
  // =============================================
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.slice(1));
      const apiKey = hashParams.get('api_key');
      if (apiKey) {
        storage.setApiKey(apiKey);
        setHasApiKey(true);
        pollinationsAPI.setApiKey(apiKey);
        toast.success('Connected! API key received via Pollinations');
        window.history.replaceState(null, '', window.location.pathname);
      }
    }
    const savedKey = storage.getApiKey();
    if (savedKey) {
      setHasApiKey(true);
      pollinationsAPI.setApiKey(savedKey);
    }
  }, []);

  // =============================================
  //  INFINITE CANVAS: Pan & Zoom
  // =============================================
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    // Only pan with hand tool or middle click
    if (activeTool === 'hand' || e.button === 1) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
    // Deselect when clicking empty canvas
    if (activeTool === 'pointer' && e.target === e.currentTarget) {
      setSelectedImageId(null);
    }
  }, [activeTool, pan]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    }
  }, [isPanning, panStart]);

  const handleCanvasMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Zoom with scroll wheel
  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.08 : 0.08;
      setZoom(prev => Math.max(0.1, Math.min(5, prev + delta)));
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  // =============================================
  //  HANDLERS
  // =============================================
  const handleBYOPAuth = () => {
    const params = new URLSearchParams({ redirect_url: APP_REDIRECT_URL });
    window.location.href = `${BYOP_AUTH_URL}?${params}`;
  };

  const handleGenerate = async () => {
    if (isGenerating) return;
    if (!prompt.trim()) { toast.error('Please enter a prompt'); return; }
    if (!hasApiKey) { toast.error('Add your API key in Settings'); return; }

    setIsGenerating(true);
    try {
      const actualSeed = seed === -1 ? Math.floor(Math.random() * 999999999) : seed;
      const fullPrompt = activeModifiers.length > 0
        ? `${prompt}, ${activeModifiers.join(', ')}` : prompt;

      const params: GenerationParams = {
        model: selectedModel, prompt: fullPrompt,
        width: aspectRatio.width, height: aspectRatio.height,
        seed: actualSeed, enhance, safe, quality: 'high' as const,
        image: referenceImages.length > 0 ? referenceImages.join('|') : undefined,
      };

      let imageUrl: string;
      if (referenceImages.length > 0) {
        imageUrl = await pollinationsAPI.generateImageOpenAI({
          prompt: fullPrompt, model: selectedModel,
          seed: actualSeed, enhance, safe,
        });
      } else {
        imageUrl = await pollinationsAPI.generateImage(params);
      }

      // Place image on canvas at center of current view
      const centerX = (-pan.x + window.innerWidth / 2) / zoom - aspectRatio.width / 2;
      const centerY = (-pan.y + window.innerHeight / 2) / zoom - aspectRatio.height / 2;

      const newImg = {
        id: generateId(), url: imageUrl,
        x: centerX, y: centerY,
        width: aspectRatio.width, height: aspectRatio.height,
        prompt: fullPrompt,
      };
      setCanvasImages(prev => [...prev, newImg]);
      setSelectedImageId(newImg.id);
      setSeed(actualSeed);

      // Save history
      const historyItem: HistoryItem = {
        id: generateId(), type: 'generate', prompt: fullPrompt,
        model: selectedModel, imageUrl, params, createdAt: Date.now(),
        referenceImage: referenceImages.length > 0 ? referenceImages[0] : undefined,
      };
      storage.setHistory([historyItem, ...storage.getHistory()].slice(0, 50));

      toast.success('Image generated!');
      setReferenceImages([]);
      if (window.innerWidth < 768) setIsSidebarOpen(false);
    } catch (error) {
      console.error('Generation error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate image');
    } finally {
      setIsGenerating(false);
    }
  };

  const processFiles = (files: File[]) => {
    const availableSlots = 4 - referenceImages.length;
    const filesToUpload = files.slice(0, availableSlots);
    
    if (filesToUpload.length === 0) {
      if (files.length > 0) toast.error('Maximum 4 reference images allowed');
      return;
    }

    filesToUpload.forEach(file => {
      if (!file.type.startsWith('image/')) {
        toast.error('Only images are allowed');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setReferenceImages(prev => {
          if (prev.length >= 4) return prev;
          return [...prev, event.target?.result as string];
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(Array.from(e.target.files || []));
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    processFiles(Array.from(e.dataTransfer.files));
  };

  const handleAddUrl = () => {
    const url = window.prompt("Enter image URL:");
    if (!url) return;
    if (referenceImages.length >= 4) {
      toast.error('Maximum 4 reference images allowed');
      return;
    }
    setReferenceImages(prev => [...prev, url]);
  };

  const removeReferenceImage = (index: number) => {
    setReferenceImages(prev => prev.filter((_, i) => i !== index));
    toast.success('Image removed');
  };

  const toggleModifier = (mod: string) => {
    setActiveModifiers(prev =>
      prev.includes(mod) ? prev.filter(m => m !== mod) : [...prev, mod]
    );
  };

  const downloadImage = async (url: string, id: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `image-gen-${id.slice(0, 8)}.png`;
      link.click();
      window.URL.revokeObjectURL(blobUrl);
      toast.success('Downloaded!');
    } catch { toast.error('Failed to download'); }
  };

  const deleteImage = (id: string) => {
    setCanvasImages(prev => prev.filter(img => img.id !== id));
    if (selectedImageId === id) setSelectedImageId(null);
    toast.success('Removed from canvas');
  };

  const resetView = () => { setPan({ x: 0, y: 0 }); setZoom(1); };

  // =============================================
  //  DRAWING LOGIC
  // =============================================
  useEffect(() => {
    if (activeTool !== 'pen' || !drawingCanvasRef.current) return;
    const canvas = drawingCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let drawing = false;

    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    ctx.strokeStyle = penColor; ctx.lineWidth = 4; ctx.lineCap = 'round';

    const coords = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      const cx = 'touches' in e ? e.touches[0]?.clientX : e.clientX;
      const cy = 'touches' in e ? e.touches[0]?.clientY : e.clientY;
      return { x: (cx || 0) - rect.left, y: (cy || 0) - rect.top };
    };
    const start = (e: MouseEvent | TouchEvent) => { drawing = true; const c = coords(e); ctx.beginPath(); ctx.moveTo(c.x, c.y); };
    const stop = () => { drawing = false; ctx.beginPath(); };
    const move = (e: MouseEvent | TouchEvent) => { if (!drawing) return; const c = coords(e); ctx.lineTo(c.x, c.y); ctx.stroke(); ctx.beginPath(); ctx.moveTo(c.x, c.y); };

    canvas.addEventListener('mousedown', start); canvas.addEventListener('mousemove', move);
    canvas.addEventListener('mouseup', stop); canvas.addEventListener('mouseout', stop);
    canvas.addEventListener('touchstart', start); canvas.addEventListener('touchmove', move);
    canvas.addEventListener('touchend', stop);
    return () => {
      canvas.removeEventListener('mousedown', start); canvas.removeEventListener('mousemove', move);
      canvas.removeEventListener('mouseup', stop); canvas.removeEventListener('mouseout', stop);
      canvas.removeEventListener('touchstart', start); canvas.removeEventListener('touchmove', move);
      canvas.removeEventListener('touchend', stop);
    };
  }, [activeTool, penColor]);

  // =============================================
  //  RENDER
  // =============================================
  return (
    <div className="w-full h-[100dvh] relative selection:bg-[#EF8354] selection:text-white overflow-hidden">

      {/* =========================================
          INFINITE CANVAS (full viewport)
      ========================================= */}
      <div
        ref={canvasContainerRef}
        className={`infinite-canvas ${activeTool === 'hand' ? 'cursor-grab' : activeTool === 'pen' ? 'cursor-crosshair' : 'cursor-default'} ${isPanning ? '!cursor-grabbing' : ''}`}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onMouseLeave={handleCanvasMouseUp}
      >
        <div
          className="canvas-transform"
          style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
        >
          {/* Canvas Images */}
          {canvasImages.map((img) => (
            <div
              key={img.id}
              className={`absolute group transition-shadow duration-200 ${selectedImageId === img.id ? 'ring-3 ring-[#EF8354] ring-offset-4 ring-offset-white/50' : 'hover:ring-2 hover:ring-[#EF8354]/30'}`}
              style={{ left: img.x, top: img.y, width: img.width, height: img.height }}
              onClick={(e) => { e.stopPropagation(); if (activeTool === 'pointer') setSelectedImageId(img.id); }}
            >
              <img src={img.url} alt={img.prompt} className="w-full h-full object-cover rounded-2xl shadow-2xl" draggable={false} />

              {/* Hover actions */}
              <div className="absolute -top-12 right-0 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => { e.stopPropagation(); downloadImage(img.url, img.id); }}
                  className="p-2 rounded-xl glass-pill text-zinc-600 hover:text-[#EF8354] transition-colors"
                >
                  <Download size={14} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteImage(img.id); }}
                  className="p-2 rounded-xl glass-pill text-zinc-600 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {/* Dimension badge */}
              <div className="absolute bottom-2 left-2 px-2 py-1 rounded-lg glass-pill text-[10px] font-semibold text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity">
                {img.width}×{img.height}
              </div>
            </div>
          ))}

          {/* Drawing overlay - sits on entire canvas */}
          {activeTool === 'pen' && (
            <canvas
              ref={drawingCanvasRef}
              className="absolute touch-none"
              style={{ left: -5000, top: -5000, width: 10000, height: 10000 }}
            />
          )}
        </div>

        {/* Empty State (centered in viewport) */}
        {canvasImages.length === 0 && !isGenerating && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center select-none">
              <div className="w-20 h-20 rounded-3xl bg-[#EF8354]/10 flex items-center justify-center mx-auto mb-5">
                <Wand2 size={36} className="text-[#EF8354]" />
              </div>
              <h2 className="text-xl font-bold text-zinc-700 mb-2">Start Creating</h2>
              <p className="text-sm text-zinc-400 max-w-[300px] mx-auto">Enter a prompt and click Generate.<br/>Scroll to zoom · Drag with Hand tool to pan</p>
            </div>
          </div>
        )}

        {/* Generating indicator (centered in viewport) */}
        {isGenerating && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div className="glass-panel rounded-3xl px-8 py-6 flex flex-col items-center gap-3 animate-fade-in">
              <Loader2 className="animate-spin text-[#EF8354]" size={36} />
              <span className="font-semibold text-zinc-700 text-sm">Synthesizing {aspectRatio.label} Image...</span>
            </div>
          </div>
        )}
      </div>


      {/* =========================================
          TOP-LEFT: MENU PILL
      ========================================= */}
      <div className="fixed top-4 left-4 md:top-6 md:left-6 z-50 flex items-center gap-2">
        <div className="glass-pill rounded-full flex items-center p-1.5 pr-2 md:pr-4 shadow-sm relative">
          {/* Mobile sidebar toggle */}
          <button
            className="md:hidden p-2 rounded-full hover:bg-black/5 text-zinc-700 transition-colors"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="hidden md:block w-px h-4 bg-zinc-200 mx-1"></div>

          {/* Gallery / Menu button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors font-medium text-sm ${menuOpen ? 'bg-[#EF8354]/10 text-[#EF8354]' : 'text-zinc-700 hover:bg-black/5'}`}
          >
            <LayoutGrid size={16} />
            <span className="hidden sm:inline">Gallery</span>
          </button>
          <div className="w-px h-4 bg-zinc-200 mx-2"></div>
          <button
            onClick={() => window.location.href = '/settings'}
            className="p-1.5 rounded-full text-zinc-500 hover:bg-black/5 transition-colors"
          >
            <Settings size={16} />
          </button>

          {/* Dropdown Menu */}
          {menuOpen && (
            <div className="absolute top-full left-0 mt-2 w-56 glass-panel rounded-2xl p-2 shadow-xl animate-slide-down z-[60]">
              <a href="/" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[#EF8354] bg-[#EF8354]/5 transition-colors">
                <Wand2 size={16} /> Image Generation
              </a>
              <a href="/history" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-700 hover:bg-black/5 transition-colors">
                <History size={16} /> History / Gallery
              </a>
              <a href="/edit" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-700 hover:bg-black/5 transition-colors">
                <ImagePlus size={16} /> Image Editor
              </a>
              <a href="/settings" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-700 hover:bg-black/5 transition-colors">
                <Settings size={16} /> Settings
              </a>
              <div className="h-px bg-zinc-200/50 my-1.5"></div>
              <div className="px-3 py-2 flex items-center justify-between">
                <span className="text-xs text-zinc-400">Zoom: {Math.round(zoom * 100)}%</span>
                <button onClick={resetView} className="text-xs font-semibold text-[#EF8354] hover:underline">Reset View</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Close menu backdrop */}
      {menuOpen && <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />}


      {/* =========================================
          TOP-RIGHT: TOOL BUTTONS
      ========================================= */}
      <div className="fixed top-4 right-4 md:top-6 md:right-6 z-50">
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

          {activeTool === 'pen' && (
            <>
              <div className="w-px h-4 bg-zinc-200 mx-1"></div>
              <div className="flex items-center gap-1.5 px-2">
                {['#EF8354', '#2D3142', '#4F5D75', '#BFC0C0', '#FFFFFF', '#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'].slice(0, 8).map(c => (
                  <button
                    key={c}
                    onClick={() => setPenColor(c)}
                    className={`w-4 h-4 rounded-full border border-zinc-200 transition-transform ${penColor === c ? 'scale-125 ring-2 ring-[#EF8354]/20' : 'hover:scale-110'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>


      {/* =========================================
          LEFT PANEL: PARAMETERS SIDEBAR
      ========================================= */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      <aside className={`fixed top-20 bottom-44 md:top-24 md:bottom-24 left-4 md:left-6 w-[300px] md:w-[320px] glass-panel rounded-[28px] p-5 md:p-6 z-50 flex flex-col gap-5 custom-scrollbar overflow-y-auto transition-transform duration-300 ease-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-[120%] md:translate-x-0'}`}>

        <header className="flex items-center justify-between pb-1 shrink-0">
          <h2 className="text-lg font-bold text-zinc-800">Parameters</h2>
          <button className="text-zinc-400 hover:text-zinc-600 md:hidden" onClick={() => setIsSidebarOpen(false)}>
            <ChevronsLeft size={20} />
          </button>
        </header>

        {/* Reference Image */}
        <section className="space-y-3 shrink-0">
          <div className="flex justify-between items-center">
            <label className="text-sm font-semibold text-zinc-700">Reference Image</label>
            {referenceImages.length > 0 ? (
              <button onClick={() => setReferenceImages([])} className="text-[11px] font-bold text-red-400 hover:text-red-500 uppercase tracking-wider flex items-center gap-1">
                <Trash2 size={12} /> Clear All
              </button>
            ) : (
              <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">Optional</span>
            )}
          </div>
          
          {referenceImages.length > 0 && (
            <div className="grid grid-cols-2 gap-2 mb-3">
              {referenceImages.map((imgUrl, i) => (
                <div key={i} className="relative aspect-square rounded-xl overflow-hidden group">
                  <img src={imgUrl} alt={`Ref ${i+1}`} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button onClick={(e) => { e.stopPropagation(); removeReferenceImage(i); }} className="p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {referenceImages.length < 4 && (
            <div
              className={`w-full ${referenceImages.length > 0 ? 'aspect-[4/1]' : 'aspect-[4/2.5]'} rounded-2xl border-2 border-dashed border-zinc-200 bg-white/40 flex flex-col items-center justify-center cursor-pointer hover:border-[#EF8354]/50 hover:bg-white/60 transition-all group relative overflow-hidden`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" multiple className="hidden" />
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#EF8354]/10 flex items-center justify-center text-[#EF8354] group-hover:scale-110 transition-transform">
                  <ImagePlus size={20} />
                </div>
                {!referenceImages.length ? (
                  <div className="text-left">
                    <span className="text-sm font-semibold text-zinc-700 block">Drop images here</span>
                    <span className="text-xs text-zinc-400 leading-none">Up to 4 images</span>
                  </div>
                ) : (
                  <span className="text-sm font-semibold text-zinc-700">Add more</span>
                )}
              </div>
            </div>
          )}
          
          <button 
             onClick={(e) => { e.stopPropagation(); handleAddUrl(); }} 
             className={`w-full text-xs font-semibold py-2.5 rounded-xl border border-zinc-200/50 bg-white/40 hover:bg-[#EF8354]/5 hover:text-[#EF8354] transition-all
               ${referenceImages.length >= 4 ? 'hidden' : 'block'}`}
          >
            Or paste image URL
          </button>
        </section>

        {/* Aspect Ratio */}
        <section className="space-y-3 shrink-0">
          <label className="text-sm font-semibold text-zinc-700 flex justify-between">
            Aspect Ratio <span className="text-[#EF8354] font-bold">{aspectRatio.label}</span>
          </label>
          <div className="bg-zinc-100/80 p-1.5 rounded-2xl flex items-center gap-1 border border-zinc-200/50 overflow-x-auto custom-scrollbar">
            {ASPECT_RATIOS.map(ratio => (
              <button
                key={ratio.id}
                onClick={() => setAspectRatio(ratio)}
                className={`flex-1 min-w-[48px] flex flex-col justify-center items-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all shrink-0
                  ${aspectRatio.id === ratio.id ? 'bg-white shadow-sm text-[#EF8354] border border-[#EF8354]/20' : 'text-zinc-500 hover:text-zinc-700 hover:bg-white/50'}`}
              >
                <div className={ratio.shapeClass}></div>
                <span>{ratio.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Model */}
        <section className="space-y-3 shrink-0">
          <label className="text-sm font-semibold text-zinc-700">Model</label>
          <div className="relative">
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full appearance-none bg-zinc-100/80 border border-zinc-200/50 rounded-xl py-3 px-4 text-sm font-semibold text-zinc-700 focus:outline-none focus:ring-2 focus:ring-[#EF8354]/20 cursor-pointer"
            >
              {models.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
            <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
          </div>
        </section>

        {/* Sliders */}
        <section className="space-y-5 shrink-0">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-semibold text-zinc-700">Style Strength</label>
              <span className="text-xs font-bold text-[#EF8354] bg-[#EF8354]/10 border border-[#EF8354]/20 px-2 py-0.5 rounded-md">{styleStrength}%</span>
            </div>
            <input type="range" min="0" max="100" value={styleStrength} onChange={e => setStyleStrength(parseInt(e.target.value))} />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-semibold text-zinc-700">Guidance Scale</label>
              <span className="text-xs font-bold text-zinc-600 bg-zinc-100 border border-zinc-200 px-2 py-0.5 rounded-md">{guidanceScale.toFixed(1)}</span>
            </div>
            <input type="range" min="1" max="20" step="0.1" value={guidanceScale} onChange={e => setGuidanceScale(parseFloat(e.target.value))} />
          </div>
        </section>

        {/* Toggles */}
        <section className="space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-zinc-700">Enhance</label>
            <div className={`toggle-switch ${enhance ? 'active' : ''}`} onClick={() => setEnhance(!enhance)} />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-zinc-700">Safe Mode</label>
            <div className={`toggle-switch ${safe ? 'active' : ''}`} onClick={() => setSafe(!safe)} />
          </div>
        </section>

        {/* Advanced Settings */}
        <section className="pt-3 border-t border-zinc-200/50 mt-auto shrink-0">
          <button className="flex items-center justify-between w-full text-zinc-500 hover:text-zinc-800 transition-colors py-2" onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}>
            <div className="flex items-center gap-2">
              <SlidersHorizontal size={16} />
              <span className="text-sm font-semibold">Advanced Settings</span>
            </div>
            <ChevronDown size={16} className={`transition-transform duration-300 ${isAdvancedOpen ? 'rotate-180' : ''}`} />
          </button>
          <div className={`overflow-hidden transition-all duration-300 ${isAdvancedOpen ? 'max-h-[200px] opacity-100 mt-3' : 'max-h-0 opacity-0'}`}>
            <div className="space-y-4 pb-2">
              <div className="flex items-center justify-between gap-4">
                <label className="text-xs font-semibold text-zinc-600 shrink-0">Seed</label>
                <div className="flex flex-1 items-center bg-zinc-100/80 rounded-lg px-3 py-1.5 border border-zinc-200/50">
                  <input type="number" value={seed} onChange={e => setSeed(Number(e.target.value))} className="w-full bg-transparent text-xs font-mono text-zinc-700 focus:outline-none" placeholder="-1 = random" />
                </div>
              </div>
              <div className="flex items-center justify-between gap-4">
                <label className="text-xs font-semibold text-zinc-600 shrink-0">Steps</label>
                <input type="range" min="1" max="100" value={steps} onChange={e => setSteps(parseInt(e.target.value))} className="flex-1" />
                <span className="text-xs font-bold text-zinc-600 w-6 text-right">{steps}</span>
              </div>
            </div>
          </div>
        </section>

      </aside>


      {/* =========================================
          BOTTOM PANEL: PROMPT & GENERATE
      ========================================= */}
      <div className="fixed bottom-4 md:bottom-6 left-4 right-4 md:left-[360px] md:right-6 glass-panel rounded-[24px] md:rounded-3xl p-3 md:p-5 z-40 flex flex-col gap-3 md:gap-4 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.15)] max-w-4xl mx-auto">

        <div className="flex flex-col md:flex-row items-stretch md:items-start gap-3 md:gap-4">
          <div className="flex-1 relative bg-white/40 md:bg-transparent rounded-2xl md:rounded-none p-3 md:p-0">
            <textarea
              className="w-full bg-transparent resize-none text-zinc-700 text-sm md:text-base leading-relaxed focus:outline-none placeholder:text-zinc-400 h-20 md:h-16 prompt-scrollbar"
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Describe what you want to see..."
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleGenerate(); } }}
            />
          </div>
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className={`text-white px-6 py-4 rounded-2xl font-bold text-sm md:text-base flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 shrink-0 h-[60px] md:h-16
              ${isGenerating ? 'bg-zinc-400 shadow-none cursor-not-allowed' : 'bg-[#EF8354] hover:bg-[#e27344] shadow-[#EF8354]/25 hover:shadow-xl hover:shadow-[#EF8354]/30'}`}
          >
            {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
            {isGenerating ? 'Synthesizing...' : 'Generate'}
          </button>
        </div>

        {/* Modifiers row */}
        <div className="flex items-center justify-between pt-2 border-t border-zinc-200/50">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar w-full md:w-auto">
            <span className="text-xs font-semibold text-zinc-400 mr-1 uppercase tracking-wide shrink-0">Modifiers:</span>
            {ALL_MODIFIERS.map(mod => {
              const isActive = activeModifiers.includes(mod);
              return (
                <button key={mod} onClick={() => toggleModifier(mod)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm whitespace-nowrap transition-colors border shrink-0
                    ${isActive ? 'bg-[#EF8354]/10 text-[#EF8354] border-[#EF8354]/30' : 'bg-white text-zinc-600 border-zinc-200 hover:border-[#EF8354]/50'}`}
                >
                  {isActive && <Check size={12} strokeWidth={3} />}
                  {mod}
                </button>
              );
            })}
          </div>
          <button className="hidden md:flex items-center gap-1.5 text-xs font-bold text-zinc-400 hover:text-[#EF8354] transition-colors whitespace-nowrap pl-4 shrink-0 border-l border-zinc-200 ml-2">
            <Plus size={14} /> Add Style
          </button>
        </div>
      </div>

    </div>
  );
}
