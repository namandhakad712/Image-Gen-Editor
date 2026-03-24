'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  LayoutGrid, Settings, MousePointer2, Hand, PenLine,
  ImagePlus, ChevronDown, ChevronsLeft, Sparkles, Plus,
  SlidersHorizontal, Menu, X, Loader2, Upload, Trash2, Check,
  Wand2, Download, RotateCcw, Eraser, Brush, Circle, Square,
  Type, Undo2, Redo2, Palette, Layers, ZoomIn, ZoomOut
} from 'lucide-react';
import { toast } from 'sonner';
import { pollinationsAPI } from '@/lib/api';
import { storage, generateId } from '@/lib/utils';
import { HistoryItem } from '@/types';

const ASPECT_RATIOS = [
  { id: '1:1', label: '1:1', shapeClass: 'shape-1-1' },
  { id: '4:3', label: '4:3', shapeClass: 'shape-4-3' },
  { id: '16:9', label: '16:9', shapeClass: 'shape-16-9' },
  { id: '21:9', label: '21:9', shapeClass: 'shape-21-9' },
  { id: '3:4', label: '3:4', shapeClass: 'shape-3-4' },
  { id: '9:16', label: '9:16', shapeClass: 'shape-9-16' }
];

const DRAWING_TOOLS = [
  { id: 'brush', icon: Brush, label: 'Brush' },
  { id: 'pen', icon: PenLine, label: 'Pen' },
  { id: 'eraser', icon: Eraser, label: 'Eraser' },
  { id: 'circle', icon: Circle, label: 'Circle' },
  { id: 'rectangle', icon: Square, label: 'Rectangle' },
  { id: 'text', icon: Type, label: 'Text' },
] as const;

const COLORS = [
  '#EF8354', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE',
  '#FFFFFF', '#000000', '#808080', '#8B4513', '#006400', '#00008B',
];

export default function EditPage() {
  // UI State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [activeTool, setActiveTool] = useState<'brush' | 'pen' | 'eraser' | 'circle' | 'rectangle' | 'text'>('brush');

  // Image State
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [editedImage, setEditedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Edit Parameters
  const [editPrompt, setEditPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState(ASPECT_RATIOS[0]);
  const [editStrength, setEditStrength] = useState(70);
  const [guidanceScale, setGuidanceScale] = useState(7.5);
  const [seed, setSeed] = useState(-1);

  // Drawing State
  const [brushSize, setBrushSize] = useState(8);
  const [brushColor, setBrushColor] = useState('#EF8354');
  const [opacity, setOpacity] = useState(100);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Drawing History
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });
  const [shapes, setShapes] = useState<Array<{ type: string; x: number; y: number; width: number; height: number; color: string; strokeWidth: number }>>([]);
  const [currentShape, setCurrentShape] = useState<{ type: string; x: number; y: number; width: number; height: number; color: string; strokeWidth: number } | null>(null);

  // Handle File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setSourceImage(result);
        setEditedImage(null);
        setHistory([]);
        setHistoryIndex(-1);
        toast.success('Image uploaded successfully');
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
        const result = event.target?.result as string;
        setSourceImage(result);
        toast.success('Image uploaded');
      };
      reader.readAsDataURL(file);
    }
  };

  // Save canvas state to history
  const saveToHistory = () => {
    const canvas = drawingCanvasRef.current;
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
      const canvas = drawingCanvasRef.current;
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
      const canvas = drawingCanvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      setHistoryIndex(historyIndex + 1);
      ctx.putImageData(history[historyIndex + 1], 0, 0);
      toast.success('Redo');
    }
  };

  // Clear Drawing
  const clearDrawing = () => {
    const canvas = drawingCanvasRef.current;
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
      toast.error('Please describe the edit you want to make');
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

      // Get drawing canvas as overlay
      const canvas = drawingCanvasRef.current;
      let imageWithDrawing = sourceImage;

      if (canvas && (shapes.length > 0 || history.length > 0)) {
        // Composite the drawing onto the source image
        const tempCanvas = document.createElement('canvas');
        const ctx = tempCanvas.getContext('2d');
        if (ctx) {
          const img = new Image();
          img.src = sourceImage;
          await new Promise((resolve) => {
            img.onload = resolve;
          });
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
        seed: actualSeed,
        enhance: true,
        safe: false,
        image: imageWithDrawing,
      });

      setEditedImage(imageUrl);
      toast.success('Edit applied successfully!');
    } catch (error) {
      console.error('Edit error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to apply edit');
    } finally {
      setIsGenerating(false);
    }
  };

  // Drawing handlers
  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (!['brush', 'pen', 'eraser', 'circle', 'rectangle'].includes(activeTool)) return;

    const canvas = drawingCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = (clientX - rect.left) * (canvas.width / rect.width);
    const y = (clientY - rect.top) * (canvas.height / rect.height);

    setLastPos({ x, y });

    if (activeTool === 'circle' || activeTool === 'rectangle') {
      setCurrentShape({
        type: activeTool,
        x,
        y,
        width: 0,
        height: 0,
        color: brushColor,
        strokeWidth: brushSize,
      });
    } else {
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
    }

    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;

    const canvas = drawingCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = (clientX - rect.left) * (canvas.width / rect.width);
    const y = (clientY - rect.top) * (canvas.height / rect.height);

    if (activeTool === 'brush' || activeTool === 'pen' || activeTool === 'eraser') {
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y);
    } else if (activeTool === 'circle' || activeTool === 'rectangle') {
      if (currentShape) {
        const width = x - currentShape.x;
        const height = y - currentShape.y;
        setCurrentShape({ ...currentShape, width, height });
      }
    }

    setLastPos({ x, y });
  };

  const stopDrawing = () => {
    if (isDrawing && currentShape) {
      setShapes([...shapes, currentShape]);
      setCurrentShape(null);
      saveToHistory();
    } else if (isDrawing) {
      saveToHistory();
    }
    setIsDrawing(false);
  };

  // Download edited image
  const downloadImage = () => {
    if (!editedImage && !sourceImage) return;

    const link = document.createElement('a');
    link.href = editedImage || sourceImage!;
    link.download = `pollinations-edit-${generateId()}.png`;
    link.click();
    toast.success('Image downloaded');
  };

  // Reset
  const handleReset = () => {
    setSourceImage(null);
    setEditedImage(null);
    setEditPrompt('');
    clearDrawing();
    toast.success('Reset complete');
  };

  // Setup canvas
  useEffect(() => {
    if (drawingCanvasRef.current && canvasRef.current) {
      const canvas = drawingCanvasRef.current;
      canvas.width = 1024;
      canvas.height = 1024;
    }
  }, []);

  const ToolButton = ({ tool }: { tool: typeof DRAWING_TOOLS[0] }) => {
    const Icon = tool.icon;
    const isActive = activeTool === tool.id;
    return (
      <button
        onClick={() => setActiveTool(tool.id)}
        className={`p-3 rounded-xl transition-all ${isActive
            ? 'bg-[#EF8354] text-white shadow-lg shadow-[#EF8354]/30'
            : 'bg-white text-zinc-600 hover:bg-zinc-100 border border-zinc-200'
          }`}
        title={tool.label}
      >
        <Icon size={18} />
      </button>
    );
  };

  return (
    <div className="w-full h-[100dvh] bg-[#18181a] dark-dots p-2 md:p-6 lg:p-8 flex items-center justify-center selection:bg-[#EF8354] selection:text-white relative overflow-hidden">
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
              onClick={() => window.location.href = '/'}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-black/5 text-zinc-700 transition-colors font-medium text-sm"
            >
              <Wand2 size={16} />
              <span className="hidden sm:inline">Generate</span>
            </button>
            <div className="w-px h-4 bg-zinc-200 mx-2"></div>
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
          <div className="glass-pill rounded-full flex flex-col items-center p-2 gap-2">
            <button
              onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
              className="p-2 rounded-full text-zinc-500 hover:text-black hover:bg-black/5 transition-colors"
              title="Zoom In"
            >
              <ZoomIn size={18} />
            </button>
            <button
              onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
              className="p-2 rounded-full text-zinc-500 hover:text-black hover:bg-black/5 transition-colors"
              title="Zoom Out"
            >
              <ZoomOut size={18} />
            </button>
            <div className="w-px h-4 bg-zinc-200"></div>
            <button
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className="p-2 rounded-full text-zinc-500 hover:text-black hover:bg-black/5 transition-colors disabled:opacity-30"
              title="Undo"
            >
              <Undo2 size={18} />
            </button>
            <button
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              className="p-2 rounded-full text-zinc-500 hover:text-black hover:bg-black/5 transition-colors disabled:opacity-30"
              title="Redo"
            >
              <Redo2 size={18} />
            </button>
            <div className="w-px h-4 bg-zinc-200"></div>
            <button
              onClick={clearDrawing}
              className="p-2 rounded-full text-zinc-500 hover:text-red-500 hover:bg-black/5 transition-colors"
              title="Clear All"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>

        {/* Canvas Workspace */}
        <div className="absolute inset-0 flex items-center justify-center p-4 pt-20 pb-48 md:pb-32 md:pl-[380px] md:pr-24 z-0">
          <div
            ref={canvasRef}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className={`relative w-full max-h-full rounded-2xl md:rounded-3xl shadow-2xl transition-all duration-500 ease-in-out flex items-center justify-center overflow-hidden bg-white border-2 border-dashed ${sourceImage ? 'border-transparent' : 'border-zinc-300'
              }`}
            style={{
              aspectRatio: aspectRatio.label as `${number}:${number}`,
              maxWidth: '100%',
            }}
          >
            {!sourceImage ? (
              <div
                className="flex flex-col items-center justify-center text-zinc-400 p-8 cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*"
                  className="hidden"
                />
                <div className="w-16 h-16 rounded-2xl bg-[#EF8354]/10 flex items-center justify-center text-[#EF8354] mb-4">
                  <ImagePlus size={32} />
                </div>
                <p className="text-sm font-semibold text-zinc-700">Upload an image to edit</p>
                <p className="text-xs mt-2 opacity-60">Drag & drop or click to browse</p>
              </div>
            ) : (
              <>
                <div
                  className="w-full h-full"
                  style={{
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                    transformOrigin: 'center center',
                  }}
                >
                  <img
                    src={editedImage || sourceImage}
                    alt="Source"
                    className="w-full h-full object-cover"
                    draggable={false}
                  />
                  <canvas
                    ref={drawingCanvasRef}
                    className="absolute inset-0 w-full h-full touch-none"
                    style={{ pointerEvents: 'auto' }}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                  />
                </div>

                {/* Render shapes overlay */}
                {shapes.map((shape, i) => (
                  <div
                    key={i}
                    className="absolute pointer-events-none"
                    style={{
                      left: shape.x,
                      top: shape.y,
                      width: shape.width,
                      height: shape.height,
                      border: shape.type === 'rectangle' ? `${shape.strokeWidth}px solid ${shape.color}` : 'none',
                      borderRadius: shape.type === 'circle' ? '50%' : '0',
                      backgroundColor: shape.type === 'rectangle' ? 'transparent' : 'transparent',
                    }}
                  />
                ))}
                {currentShape && (
                  <div
                    className="absolute pointer-events-none"
                    style={{
                      left: currentShape.x,
                      top: currentShape.y,
                      width: currentShape.width,
                      height: currentShape.height,
                      border: currentShape.type === 'rectangle' ? `${currentShape.strokeWidth}px solid ${currentShape.color}` : 'none',
                      borderRadius: currentShape.type === 'circle' ? '50%' : '0',
                    }}
                  />
                )}

                {/* Generating Overlay */}
                {isGenerating && (
                  <div className="absolute inset-0 glass-overlay z-30 flex flex-col items-center justify-center">
                    <div className="scan-line"></div>
                    <Loader2 className="animate-spin text-[#EF8354] mb-4" size={40} />
                    <div className="bg-white/80 backdrop-blur-md px-6 py-2 rounded-full shadow-lg border border-white font-semibold text-zinc-700 text-sm animate-pulse">
                      Applying AI Edit...
                    </div>
                  </div>
                )}
              </>
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

        {/* Left Sidebar */}
        <aside
          className={`absolute top-20 bottom-44 md:top-24 md:bottom-24 left-4 md:left-6 w-[320px] md:w-[340px] glass-panel rounded-[28px] p-5 md:p-6 z-50 flex flex-col gap-6 custom-scrollbar overflow-y-auto transition-transform duration-300 ease-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-[120%] md:translate-x-0'
            }`}
        >
          <header className="flex items-center justify-between pb-2 shrink-0">
            <h2 className="text-lg font-bold text-zinc-800">Edit Tools</h2>
            <button
              className="text-zinc-400 hover:text-zinc-600 md:hidden"
              onClick={() => setIsSidebarOpen(false)}
            >
              <ChevronsLeft size={20} />
            </button>
          </header>

          {/* Drawing Tools */}
          <section className="space-y-3 shrink-0">
            <label className="text-sm font-semibold text-zinc-700">Drawing Tools</label>
            <div className="grid grid-cols-3 gap-2">
              {DRAWING_TOOLS.map((tool) => (
                <ToolButton key={tool.id} tool={tool} />
              ))}
            </div>
          </section>

          {/* Color Picker */}
          <section className="space-y-3 shrink-0">
            <label className="text-sm font-semibold text-zinc-700">Color</label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setBrushColor(color)}
                  className={`w-8 h-8 rounded-lg border-2 transition-all ${brushColor === color ? 'border-zinc-800 scale-110 shadow-md' : 'border-zinc-200 hover:scale-105'
                    }`}
                  style={{ backgroundColor: color }}
                />
              ))}
              <input
                type="color"
                value={brushColor}
                onChange={(e) => setBrushColor(e.target.value)}
                className="w-8 h-8 rounded-lg border-2 border-zinc-200 cursor-pointer"
              />
            </div>
          </section>

          {/* Brush Settings */}
          <section className="space-y-3 shrink-0">
            <div className="flex justify-between items-center">
              <label className="text-sm font-semibold text-zinc-700">Brush Size</label>
              <span className="text-xs font-bold text-[#EF8354] bg-[#EF8354]/10 border border-[#EF8354]/20 px-2 py-1 rounded-md">
                {brushSize}px
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="50"
              value={brushSize}
              onChange={(e) => setBrushSize(parseInt(e.target.value))}
            />

            <div className="flex justify-between items-center">
              <label className="text-sm font-semibold text-zinc-700">Opacity</label>
              <span className="text-xs font-bold text-zinc-600 bg-zinc-100 border border-zinc-200 px-2 py-1 rounded-md">
                {opacity}%
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="100"
              value={opacity}
              onChange={(e) => setOpacity(parseInt(e.target.value))}
            />
          </section>

          {/* Edit Prompt */}
          <section className="space-y-3 shrink-0">
            <label className="text-sm font-semibold text-zinc-700">AI Edit Prompt</label>
            <textarea
              className="w-full bg-zinc-100/80 border border-zinc-200/50 rounded-xl p-3 text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-[#EF8354]/20 resize-none"
              rows={3}
              value={editPrompt}
              onChange={(e) => setEditPrompt(e.target.value)}
              placeholder="Describe what you want to change..."
            />
          </section>

          {/* Edit Strength */}
          <section className="space-y-3 shrink-0">
            <div className="flex justify-between items-center">
              <label className="text-sm font-semibold text-zinc-700">Edit Strength</label>
              <span className="text-xs font-bold text-[#EF8354] bg-[#EF8354]/10 border border-[#EF8354]/20 px-2 py-1 rounded-md">
                {editStrength}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={editStrength}
              onChange={(e) => setEditStrength(parseInt(e.target.value))}
            />
          </section>

          {/* Advanced */}
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
              <div className="space-y-4 pb-2 mt-4">
                <div className="flex items-center justify-between gap-4">
                  <label className="text-xs font-semibold text-zinc-600 shrink-0">Guidance</label>
                  <input
                    type="number"
                    step="0.1"
                    value={guidanceScale}
                    onChange={(e) => setGuidanceScale(parseFloat(e.target.value))}
                    className="flex-1 bg-zinc-100/80 rounded-lg px-3 py-1.5 border border-zinc-200/50 text-xs font-semibold text-zinc-700 focus:outline-none"
                  />
                </div>
                <div className="flex items-center justify-between gap-4">
                  <label className="text-xs font-semibold text-zinc-600 shrink-0">Seed</label>
                  <input
                    type="number"
                    value={seed}
                    onChange={(e) => setSeed(parseInt(e.target.value) || -1)}
                    className="flex-1 bg-zinc-100/80 rounded-lg px-3 py-1.5 border border-zinc-200/50 text-xs font-semibold text-zinc-700 focus:outline-none"
                  />
                </div>
              </div>
            )}
          </section>
        </aside>

        {/* Bottom Panel */}
        <div className="absolute bottom-4 md:bottom-6 left-4 right-4 md:left-[380px] md:right-24 glass-panel rounded-[24px] md:rounded-3xl p-3 md:p-5 z-40 flex flex-col gap-3 md:gap-4 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.15)] max-w-4xl mx-auto">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 rounded-xl text-sm font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors"
              >
                <Upload size={16} />
                Upload
              </button>
              {sourceImage && (
                <button
                  onClick={handleReset}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 rounded-xl text-sm font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors"
                >
                  <RotateCcw size={16} />
                  Reset
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {(editedImage || sourceImage) && (
                <button
                  onClick={downloadImage}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 rounded-xl text-sm font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors"
                >
                  <Download size={16} />
                  Save
                </button>
              )}
              <button
                onClick={handleApplyEdit}
                disabled={isGenerating || !sourceImage || !editPrompt.trim()}
                className={`text-white px-6 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 ${isGenerating || !sourceImage || !editPrompt.trim()
                    ? 'bg-zinc-400 shadow-none cursor-not-allowed'
                    : 'bg-[#EF8354] hover:bg-[#e27344] shadow-[#EF8354]/25 hover:shadow-xl'
                  }`}
              >
                {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                {isGenerating ? 'Applying...' : 'Apply Edit'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
