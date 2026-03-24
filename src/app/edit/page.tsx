'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles, Download, Share2, ZoomIn, ZoomOut, RotateCcw,
  Wand2, ImagePlus, History, Settings, Trash2, X,
  MousePointer2, Hand, PenLine, Brush, Eraser,
  Undo2, Redo2, Loader2, Eye, EyeOff, Upload,
  Check
} from 'lucide-react';
import { toast } from 'sonner';
import { pollinationsAPI } from '@/lib/api';
import { storage } from '@/lib/utils';

const COLORS = [
  '#EF8354', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE',
  '#FFFFFF', '#000000',
];

export default function EditPage() {
  // UI State
  const [showPanel, setShowPanel] = useState<'tools' | 'settings' | 'history'>('tools');
  const [activeTool, setActiveTool] = useState<'pan' | 'brush' | 'eraser'>('pan');

  // Image State
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editPrompt, setEditPrompt] = useState('');
  const [editStrength, setEditStrength] = useState(70);

  // Canvas State
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Drawing State
  const [brushSize, setBrushSize] = useState(8);
  const [brushColor, setBrushColor] = useState('#EF8354');
  const [opacity, setOpacity] = useState(100);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setSourceImage(result);
        setHistory([]);
        setHistoryIndex(-1);
        toast.success('Image uploaded');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setSourceImage(event.target?.result as string);
        toast.success('Image uploaded');
      };
      reader.readAsDataURL(file);
    }
  };

  // Save to history
  const saveToHistory = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(imageData);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  // Undo
  const handleUndo = () => {
    if (historyIndex > 0) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      setHistoryIndex(historyIndex - 1);
      ctx.putImageData(history[historyIndex - 1], 0, 0);
      toast.success('Undo');
    }
  };

  // Redo
  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      setHistoryIndex(historyIndex + 1);
      ctx.putImageData(history[historyIndex + 1], 0, 0);
      toast.success('Redo');
    }
  };

  // Clear drawing
  const clearDrawing = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        saveToHistory();
        toast.success('Canvas cleared');
      }
    }
  };

  // Apply AI Edit
  const handleApplyEdit = async () => {
    if (!sourceImage) {
      toast.error('Please upload an image first');
      return;
    }
    if (!editPrompt.trim()) {
      toast.error('Please describe the edit');
      return;
    }

    const apiKey = storage.getApiKey();
    if (!apiKey) {
      toast.error('Please add API key in settings');
      setShowPanel('settings');
      return;
    }

    pollinationsAPI.setApiKey(apiKey);
    setIsGenerating(true);

    try {
      // Composite drawing with source image
      let imageWithDrawing = sourceImage;
      const canvas = canvasRef.current;
      if (canvas && history.length > 0) {
        const tempCanvas = document.createElement('canvas');
        const ctx = tempCanvas.getContext('2d');
        if (ctx) {
          const img = new Image();
          img.src = sourceImage;
          await new Promise((resolve) => { img.onload = resolve; });
          tempCanvas.width = img.width;
          tempCanvas.height = img.height;
          ctx.drawImage(img, 0, 0);
          ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, img.width, img.height);
          imageWithDrawing = tempCanvas.toDataURL('image/png');
        }
      }

      const imageUrl = await pollinationsAPI.generateImageOpenAI({
        prompt: editPrompt,
        model: 'flux-edit',
        seed: Math.floor(Math.random() * 1000000),
        enhance: true,
        safe: false,
        image: imageWithDrawing,
      });

      setSourceImage(imageUrl);
      clearDrawing();
      toast.success('Edit applied!');
      setEditPrompt('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to apply edit');
    } finally {
      setIsGenerating(false);
    }
  };

  // Drawing handlers
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (activeTool !== 'brush' && activeTool !== 'eraser') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = (clientX - rect.left) * (canvas.width / rect.width);
    const y = (clientY - rect.top) * (canvas.height / rect.height);

    setLastPos({ x, y });

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.strokeStyle = activeTool === 'eraser' ? 'rgba(0,0,0,1)' : brushColor;
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = opacity / 100;

      if (activeTool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
      } else {
        ctx.globalCompositeOperation = 'source-over';
      }

      ctx.beginPath();
      ctx.moveTo(x, y);
    }

    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = (clientX - rect.left) * (canvas.width / rect.width);
    const y = (clientY - rect.top) * (canvas.height / rect.height);

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);

    setLastPos({ x, y });
  };

  const stopDrawing = () => {
    if (isDrawing) {
      saveToHistory();
    }
    setIsDrawing(false);
  };

  // Canvas pan handlers
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
    if (isDrawing) {
      draw(e);
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    stopDrawing();
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || activeTool === 'pan') {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom((prev) => Math.max(0.5, Math.min(3, prev + delta)));
    }
  };

  // Download
  const downloadImage = () => {
    if (!sourceImage) return;
    const link = document.createElement('a');
    link.href = sourceImage;
    link.download = `pollinations-edit-${Date.now()}.png`;
    link.click();
    toast.success('Image downloaded');
  };

  // Reset
  const handleReset = () => {
    setSourceImage(null);
    setEditPrompt('');
    clearDrawing();
    toast.success('Reset complete');
  };

  // Setup canvas
  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.width = 2048;
      canvasRef.current.height = 2048;
    }
  }, []);

  return (
    <div className="w-full h-screen bg-[#0a0a0f] overflow-hidden relative">
      {/* Top Toolbar */}
      <div className="fixed top-0 left-0 right-0 z-50 glass-panel border-b border-white/10">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Left - Nav */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => window.location.href = '/'}
              className="toolbar-btn text-zinc-400 hover:text-white hover:bg-white/5"
            >
              <Wand2 size={18} />
              Generate
            </button>
            <div className="h-6 w-px bg-white/20" />
            <span className="text-lg font-bold text-white">Image Editor</span>
            <div className="h-6 w-px bg-white/20" />
            <button
              onClick={() => window.location.href = '/history'}
              className="toolbar-btn text-zinc-400 hover:text-white hover:bg-white/5"
            >
              <History size={18} />
              Gallery
            </button>
          </div>

          {/* Center - Zoom */}
          <div className="flex items-center gap-2 glass-panel rounded-xl p-1">
            <button
              onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
              className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10"
            >
              <ZoomOut size={16} />
            </button>
            <span className="text-sm text-zinc-400 w-14 text-center">{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
              className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10"
            >
              <ZoomIn size={16} />
            </button>
            <div className="w-px h-4 bg-white/20 mx-1" />
            <button
              onClick={() => { setPan({ x: 0, y: 0 }); setZoom(1); }}
              className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10"
            >
              <RotateCcw size={16} />
            </button>
          </div>

          {/* Right - Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 disabled:opacity-30"
            >
              <Undo2 size={18} />
            </button>
            <button
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 disabled:opacity-30"
            >
              <Redo2 size={18} />
            </button>
            <div className="w-px h-6 bg-white/20" />
            <button
              onClick={clearDrawing}
              className="p-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10"
            >
              <Trash2 size={18} />
            </button>
            {sourceImage && (
              <button
                onClick={downloadImage}
                className="toolbar-btn bg-[#EF8354] text-white hover:bg-[#e27344]"
              >
                <Download size={18} />
                Save
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Canvas Area */}
      <div
        ref={containerRef}
        className="absolute inset-0 pt-16"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        <div
          className="w-full h-full relative"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        >
          {!sourceImage ? (
            <div
              className="absolute inset-0 flex items-center justify-center cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*"
                className="hidden"
              />
              <div className="text-center">
                <div className="w-20 h-20 rounded-2xl bg-[#EF8354]/10 flex items-center justify-center mx-auto mb-6">
                  <Upload className="h-10 w-10 text-[#EF8354]" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Upload an Image</h2>
                <p className="text-zinc-400">Drag & drop or click to browse</p>
              </div>
            </div>
          ) : (
            <div className="relative" style={{ width: 2048, height: 2048 }}>
              <img
                src={sourceImage}
                alt="Source"
                className="absolute inset-0 w-full h-full object-contain"
                draggable={false}
              />
              <canvas
                ref={canvasRef}
                className="absolute inset-0"
                style={{ pointerEvents: activeTool === 'pan' ? 'none' : 'auto' }}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
            </div>
          )}

          {/* Generating Overlay */}
          {isGenerating && (
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="text-center">
                <Loader2 className="h-12 w-12 text-[#EF8354] animate-spin mx-auto mb-4" />
                <p className="text-white font-medium">Applying AI Edit...</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tools Panel */}
      {showPanel === 'tools' && (
        <div className="fixed left-6 top-1/2 -translate-y-1/2 z-50">
          <div className="glass-panel rounded-2xl p-2 border border-white/10 flex flex-col gap-2">
            <button
              onClick={() => setActiveTool('pan')}
              className={`p-3 rounded-xl transition-all ${activeTool === 'pan' ? 'bg-[#EF8354] text-white' : 'text-zinc-400 hover:text-white hover:bg-white/10'}`}
              title="Pan Tool"
            >
              <Hand size={20} />
            </button>
            <button
              onClick={() => setActiveTool('brush')}
              className={`p-3 rounded-xl transition-all ${activeTool === 'brush' ? 'bg-[#EF8354] text-white' : 'text-zinc-400 hover:text-white hover:bg-white/10'}`}
              title="Brush Tool"
            >
              <Brush size={20} />
            </button>
            <button
              onClick={() => setActiveTool('eraser')}
              className={`p-3 rounded-xl transition-all ${activeTool === 'eraser' ? 'bg-[#EF8354] text-white' : 'text-zinc-400 hover:text-white hover:bg-white/10'}`}
              title="Eraser Tool"
            >
              <Eraser size={20} />
            </button>
          </div>
        </div>
      )}

      {/* Bottom Panel - Edit Controls */}
      {sourceImage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-3xl px-4">
          <div className="glass-panel rounded-3xl p-6 border border-white/10">
            <div className="flex items-start gap-4 mb-4">
              <div className="flex-1">
                <textarea
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#EF8354]/50 resize-none h-20"
                  placeholder="Describe what you want to change..."
                  value={editPrompt}
                  onChange={(e) => setEditPrompt(e.target.value)}
                />
              </div>
              <button
                onClick={handleApplyEdit}
                disabled={isGenerating || !editPrompt.trim()}
                className={`px-6 py-4 rounded-xl font-bold text-white flex items-center gap-2 transition-all ${isGenerating || !editPrompt.trim()
                    ? 'bg-zinc-600 cursor-not-allowed'
                    : 'bg-gradient-to-r from-[#EF8354] to-purple-600 hover:from-[#e27344] hover:to-purple-500'
                  }`}
              >
                {isGenerating ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
                {isGenerating ? 'Applying...' : 'Apply Edit'}
              </button>
            </div>

            <div className="flex items-center gap-6">
              {/* Brush Size */}
              <div className="flex-1">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-zinc-400">Brush Size</span>
                  <span className="text-xs text-[#EF8354]">{brushSize}px</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={brushSize}
                  onChange={(e) => setBrushSize(parseInt(e.target.value))}
                />
              </div>

              {/* Opacity */}
              <div className="flex-1">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-zinc-400">Opacity</span>
                  <span className="text-xs text-[#EF8354]">{opacity}%</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={opacity}
                  onChange={(e) => setOpacity(parseInt(e.target.value))}
                />
              </div>

              {/* Edit Strength */}
              <div className="flex-1">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-zinc-400">Edit Strength</span>
                  <span className="text-xs text-[#EF8354]">{editStrength}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={editStrength}
                  onChange={(e) => setEditStrength(parseInt(e.target.value))}
                />
              </div>
            </div>

            {/* Colors */}
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-white/10">
              {COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setBrushColor(color)}
                  className={`w-8 h-8 rounded-lg border-2 transition-all ${brushColor === color ? 'border-white scale-110' : 'border-transparent hover:scale-105'}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
