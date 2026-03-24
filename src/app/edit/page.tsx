'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  LayoutGrid, Settings, Upload, Wand2, History,
  Sparkles, Loader2, ImagePlus, Trash2, Download, X,
  RotateCcw, ChevronDown, Video, BarChart3
} from 'lucide-react';
import { toast } from 'sonner';
import { pollinationsAPI } from '@/lib/api';
import { storage, generateId } from '@/lib/utils';
import { HistoryItem, GenerationParams } from '@/types';

const DEFAULT_MODELS = [
  { value: 'flux', label: 'Flux Schnell' },
  { value: 'kontext', label: 'FLUX.1 Kontext' },
  { value: 'klein', label: 'FLUX.2 Klein 4B' },
  { value: 'gptimage', label: 'GPT Image 1 Mini' },
  { value: 'gptimage-large', label: 'GPT Image 1.5' },
  { value: 'nanobanana', label: 'NanoBanana' },
];

export default function EditPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState('kontext');
  const [isProcessing, setIsProcessing] = useState(false);
  const [models, setModels] = useState(DEFAULT_MODELS);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setSourceImage(event.target?.result as string);
        setResultImage(null);
        toast.success('Image loaded');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEdit = async () => {
    if (!sourceImage) { toast.error('Upload an image first'); return; }
    if (!prompt.trim()) { toast.error('Enter an edit prompt'); return; }

    const apiKey = storage.getApiKey();
    if (!apiKey) { toast.error('Add API key in Settings'); return; }

    pollinationsAPI.setApiKey(apiKey);
    setIsProcessing(true);

    try {
      const result = await pollinationsAPI.editImage({
        model: selectedModel,
        prompt: prompt,
        image: sourceImage,
        width: 1024,
        height: 1024,
        seed: Math.floor(Math.random() * 999999),
        enhance: true,
        safe: false,
      });

      setResultImage(result);

      // Save to history
      const historyItem: HistoryItem = {
        id: generateId(), type: 'edit', prompt,
        model: selectedModel, imageUrl: result,
        params: { model: selectedModel, prompt, width: 1024, height: 1024, seed: -1, enhance: true, safe: false },
        createdAt: Date.now(), referenceImage: sourceImage,
      };
      storage.setHistory([historyItem, ...storage.getHistory()].slice(0, 50));

      toast.success('Image edited!');
    } catch (error) {
      console.error('Edit error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to edit image');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = async () => {
    if (!resultImage) return;
    try {
      // If it's a base64 image
      if (resultImage.startsWith('data:')) {
        const link = document.createElement('a');
        link.href = resultImage;
        link.download = `edited-${Date.now()}.png`;
        link.click();
      } else {
        const response = await fetch(resultImage);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `edited-${Date.now()}.png`;
        link.click();
        window.URL.revokeObjectURL(url);
      }
      toast.success('Downloaded!');
    } catch { toast.error('Failed to download'); }
  };

  return (
    <div className="w-full h-[100dvh] relative selection:bg-[#EF8354] selection:text-white overflow-auto">

      {/* Top-left nav pill */}
      <div className="fixed top-4 left-4 md:top-6 md:left-6 z-50 flex items-center gap-2">
        <div className="glass-pill rounded-full flex items-center p-1.5 pr-4 shadow-sm relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors font-medium text-sm ${menuOpen ? 'bg-[#EF8354]/10 text-[#EF8354]' : 'text-zinc-700 hover:bg-black/5'}`}
          >
            <LayoutGrid size={16} />
            <span className="hidden sm:inline">Gallery</span>
          </button>
          <div className="w-px h-4 bg-zinc-200 mx-2"></div>
          <button onClick={() => window.location.href = '/settings'} className="p-1.5 rounded-full text-zinc-500 hover:bg-black/5 transition-colors">
            <Settings size={16} />
          </button>

          {menuOpen && (
            <div className="absolute top-full left-0 mt-2 w-56 glass-panel rounded-2xl p-2 shadow-xl animate-slide-down z-[60]">
              <a href="/" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-700 hover:bg-black/5 transition-colors">
                <Wand2 size={16} /> Image Generation
              </a>
              <a href="/history" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-700 hover:bg-black/5 transition-colors">
                <History size={16} /> My Generations
              </a>
              <a href="/edit" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[#EF8354] bg-[#EF8354]/5 transition-colors">
                <ImagePlus size={16} /> Image Editor
              </a>
              <a href="/video" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-700 hover:bg-black/5 transition-colors">
                <Video size={16} /> Video Generation
              </a>
              <a href="/usage" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-700 hover:bg-black/5 transition-colors">
                <BarChart3 size={16} /> Usage Dashboard
              </a>
              <a href="/settings" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-700 hover:bg-black/5 transition-colors">
                <Settings size={16} /> Settings
              </a>
            </div>
          )}
        </div>
      </div>
      {menuOpen && <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />}

      {/* Main content */}
      <div className="max-w-5xl mx-auto pt-24 px-4 pb-10 space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#EF8354]/10 flex items-center justify-center text-[#EF8354]">
            <ImagePlus size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-800">Image Editor</h1>
            <p className="text-xs text-zinc-400">Upload an image and describe your edits</p>
          </div>
        </div>

        {/* Image comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Source */}
          <div className="glass-panel rounded-3xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-800">Source</h3>
              {sourceImage && (
                <button onClick={() => { setSourceImage(null); setResultImage(null); }} className="text-[11px] font-bold text-red-400 hover:text-red-500 uppercase tracking-wider flex items-center gap-1">
                  <Trash2 size={12} /> Clear
                </button>
              )}
            </div>
            {sourceImage ? (
              <div className="rounded-2xl overflow-hidden bg-zinc-100">
                <img src={sourceImage} alt="Source" className="w-full object-contain max-h-[50vh]" />
              </div>
            ) : (
              <div
                className="aspect-square rounded-2xl border-2 border-dashed border-zinc-200 bg-white/40 flex flex-col items-center justify-center cursor-pointer hover:border-[#EF8354]/50 hover:bg-white/60 transition-all group"
                onClick={() => fileInputRef.current?.click()}
              >
                <input type="file" ref={fileInputRef} onChange={handleUpload} accept="image/*" className="hidden" />
                <div className="w-14 h-14 rounded-xl bg-[#EF8354]/10 flex items-center justify-center text-[#EF8354] mb-3 group-hover:scale-110 transition-transform">
                  <Upload size={24} />
                </div>
                <span className="text-sm font-semibold text-zinc-700">Upload image</span>
                <span className="text-xs text-zinc-400 mt-1">Click or drag to upload</span>
              </div>
            )}
          </div>

          {/* Result */}
          <div className="glass-panel rounded-3xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-800">Result</h3>
              {resultImage && (
                <button onClick={handleDownload} className="text-[11px] font-bold text-[#EF8354] hover:text-[#e27344] uppercase tracking-wider flex items-center gap-1">
                  <Download size={12} /> Download
                </button>
              )}
            </div>
            {resultImage ? (
              <div className="rounded-2xl overflow-hidden bg-zinc-100">
                <img src={resultImage} alt="Result" className="w-full object-contain max-h-[50vh]" />
              </div>
            ) : (
              <div className="aspect-square rounded-2xl bg-zinc-50 flex flex-col items-center justify-center">
                <Sparkles className="text-zinc-300 mb-3" size={32} />
                <span className="text-sm text-zinc-400 font-medium">Result will appear here</span>
              </div>
            )}
          </div>
        </div>

        {/* Edit controls */}
        <div className="glass-panel rounded-3xl p-5 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <textarea
                className="w-full bg-zinc-100/80 border border-zinc-200/50 rounded-xl p-3 text-sm text-zinc-700 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#EF8354]/20 resize-none h-20"
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder="Describe what to change..."
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEdit(); } }}
              />
            </div>
            <div className="flex flex-col gap-2 shrink-0">
              <div className="relative">
                <select
                  value={selectedModel}
                  onChange={e => setSelectedModel(e.target.value)}
                  className="w-full md:w-48 appearance-none bg-zinc-100/80 border border-zinc-200/50 rounded-xl py-2.5 px-4 text-sm font-semibold text-zinc-700 focus:outline-none focus:ring-2 focus:ring-[#EF8354]/20 cursor-pointer"
                >
                  {models.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
                <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
              </div>
              <button
                onClick={handleEdit}
                disabled={isProcessing || !sourceImage}
                className={`py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all
                  ${isProcessing || !sourceImage ? 'bg-zinc-300 text-zinc-500 cursor-not-allowed' : 'bg-[#EF8354] text-white hover:bg-[#e27344] shadow-lg shadow-[#EF8354]/20 active:scale-95'}`}
              >
                {isProcessing ? <><Loader2 size={16} className="animate-spin" /> Processing...</> : <><Wand2 size={16} /> Apply Edit</>}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
