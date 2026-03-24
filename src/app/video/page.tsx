'use client';

import React, { useState, useEffect } from 'react';
import {
  LayoutGrid, Settings, Wand2, History, Video, Play,
  Loader2, Download, Sparkles, ChevronDown, Zap, Key,
  Film, Music, Music2, Image as ImageIcon
} from 'lucide-react';
import { toast } from 'sonner';
import { pollinationsAPI } from '@/lib/api';
import { storage, generateId } from '@/lib/utils';
import { HistoryItem, GenerationParams, VideoModel } from '@/types';

const DEFAULT_VIDEO_MODELS = [
  { value: 'wan-fast', label: 'Wan 2.2 - Fast (5s, 480p)' },
  { value: 'wan', label: 'Wan 2.6 - Quality (2-15s, 1080p)' },
  { value: 'veo', label: 'Veo 3.1 Fast - Google (Preview)' },
  { value: 'seedance', label: 'Seedance Lite - Better Quality' },
  { value: 'seedance-pro', label: 'Seedance Pro-Fast - Better Prompt Adherence' },
  { value: 'grok-video-pro', label: 'Grok Video Pro - xAI (720p, 1-15s)' },
  { value: 'ltx-2', label: 'LTX-2 - Fast' },
  { value: 'p-video', label: 'Pruna p-video (up to 1080p)' },
  { value: 'nova-reel', label: 'Amazon Nova Reel (6-30s, 720p)' },
];

const ASPECT_RATIOS = [
  { id: '16:9', label: '16:9 Landscape', value: '16:9' },
  { id: '9:16', label: '9:16 Portrait', value: '9:16' },
];

export default function VideoPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState('wan-fast');
  const [models, setModels] = useState(DEFAULT_VIDEO_MODELS);
  const [duration, setDuration] = useState(5);
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [audio, setAudio] = useState(true);
  const [seed, setSeed] = useState(-1);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);

  // Fetch video models from live API
  useEffect(() => {
    fetch('https://image.pollinations.ai/models')
      .then(res => res.json())
      .then((data: any[]) => {
        // Filter for video models based on output_modalities
        const videoModels = data.filter(m => 
          m.output_modalities?.includes('video')
        );
        if (videoModels.length > 0) {
          setModels(videoModels.map(m => ({ 
            value: m.name, 
            label: m.description || m.name || m.id 
          })));
        }
      }).catch(err => console.error('Failed to fetch video models:', err));
  }, []);

  // Check API key
  useEffect(() => {
    const savedKey = storage.getApiKey();
    if (savedKey) {
      setHasApiKey(true);
      pollinationsAPI.setApiKey(savedKey);
    }
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      setReferenceImage(event.target?.result as string);
      toast.success('Reference image loaded');
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    if (isGenerating) return;
    if (!prompt.trim()) { toast.error('Please enter a prompt'); return; }
    if (!hasApiKey) { toast.error('Add your API key in Settings first'); return; }

    setIsGenerating(true);
    try {
      const actualSeed = seed === -1 ? Math.floor(Math.random() * 999999999) : seed;
      
      const params: GenerationParams & { duration?: number; audio?: boolean } = {
        model: selectedModel,
        prompt,
        seed: actualSeed,
        duration,
        aspectRatio: aspectRatio as '16:9' | '9:16',
        audio,
        image: referenceImage || undefined,
        width: aspectRatio === '16:9' ? 1280 : 720,
        height: aspectRatio === '16:9' ? 720 : 1280,
        enhance: false,
        safe: false,
      };

      const videoUrl = await pollinationsAPI.generateVideo(params);

      setGeneratedVideo(videoUrl);

      // Save to history
      const historyItem: HistoryItem = {
        id: generateId(),
        type: 'video',
        prompt,
        model: selectedModel,
        imageUrl: videoUrl,
        params,
        createdAt: Date.now(),
      };
      storage.setHistory([historyItem, ...storage.getHistory()].slice(0, 50));

      toast.success('Video generated!');
    } catch (error) {
      console.error('Video generation error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate video');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!generatedVideo) return;
    try {
      const response = await fetch(generatedVideo);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `video-${generateId().slice(0, 8)}.mp4`;
      link.click();
      window.URL.revokeObjectURL(blobUrl);
      toast.success('Video downloaded!');
    } catch {
      toast.error('Failed to download video');
    }
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
          <button className="p-1.5 rounded-full bg-[#EF8354]/10 text-[#EF8354] transition-colors">
            <Video size={16} />
          </button>

          {menuOpen && (
            <div className="absolute top-full left-0 mt-2 w-56 glass-panel rounded-2xl p-2 shadow-xl animate-slide-down z-[60]">
              <a href="/" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-700 hover:bg-black/5 transition-colors">
                <Wand2 size={16} /> Image Generation
              </a>
              <a href="/history" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-700 hover:bg-black/5 transition-colors">
                <History size={16} /> History / Gallery
              </a>
              <a href="/edit" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-700 hover:bg-black/5 transition-colors">
                <ImageIcon size={16} /> Image Editor
              </a>
              <a href="/video" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[#EF8354] bg-[#EF8354]/5 transition-colors">
                <Video size={16} /> Video Generation
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
      <div className="max-w-4xl mx-auto pt-24 px-4 pb-10 space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#EF8354]/10 flex items-center justify-center text-[#EF8354]">
            <Film size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-800">Video Generation</h1>
            <p className="text-sm text-zinc-400">Create videos from text prompts or reference images</p>
          </div>
        </div>

        {/* Connection warning */}
        {!hasApiKey && (
          <div className="glass-panel rounded-2xl p-4 flex items-center gap-3 border border-amber-200 bg-amber-50/50">
            <Key size={20} className="text-amber-500 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-700">API Key Required</p>
              <p className="text-xs text-amber-600">Add your API key in Settings to generate videos</p>
            </div>
            <button
              onClick={() => window.location.href = '/settings'}
              className="text-xs font-bold text-amber-700 hover:underline"
            >
              Go to Settings →
            </button>
          </div>
        )}

        {/* Generated Video Preview */}
        {generatedVideo && (
          <div className="glass-panel rounded-3xl p-6 space-y-4">
            <div className="aspect-video bg-black/5 rounded-2xl overflow-hidden flex items-center justify-center">
              <video
                src={generatedVideo}
                controls
                className="w-full h-full"
                autoPlay
                loop
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleDownload}
                className="flex-1 py-3 rounded-xl font-bold text-sm text-white bg-[#EF8354] hover:bg-[#e27344] transition-all flex items-center justify-center gap-2"
              >
                <Download size={16} /> Download Video
              </button>
              <button
                onClick={() => setGeneratedVideo(null)}
                className="px-4 py-3 rounded-xl font-semibold text-sm border border-zinc-200 hover:bg-zinc-50 transition-colors"
              >
                New Video
              </button>
            </div>
          </div>
        )}

        {/* Generation Form */}
        <div className="glass-panel rounded-3xl p-6 space-y-6">
          
          {/* Prompt */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-zinc-700">Video Prompt</label>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Describe the video you want to create..."
              className="w-full bg-zinc-100/80 border border-zinc-200/50 rounded-xl px-4 py-3 text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-[#EF8354]/20 resize-none"
              rows={4}
            />
          </div>

          {/* Reference Image */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
              <ImageIcon size={16} />
              Reference Image (optional)
            </label>
            {referenceImage ? (
              <div className="relative aspect-video rounded-xl overflow-hidden">
                <img src={referenceImage} alt="Reference" className="w-full h-full object-cover" />
                <button
                  onClick={() => setReferenceImage(null)}
                  className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                >
                  <LayoutGrid size={14} className="rotate-45" />
                </button>
              </div>
            ) : (
              <label className="block w-full aspect-video rounded-2xl border-2 border-dashed border-zinc-200 bg-white/40 flex flex-col items-center justify-center cursor-pointer hover:border-[#EF8354]/50 hover:bg-white/60 transition-all">
                <input type="file" onChange={handleFileUpload} accept="image/*" className="hidden" />
                <ImageIcon size={32} className="text-zinc-300 mb-2" />
                <span className="text-sm font-semibold text-zinc-500">Upload reference image</span>
                <span className="text-xs text-zinc-400">Optional - for image-to-video</span>
              </label>
            )}
          </div>

          {/* Model Selection */}
          <div className="space-y-2">
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
          </div>

          {/* Video Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Duration */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-semibold text-zinc-700">Duration</label>
                <span className="text-xs font-bold text-[#EF8354] bg-[#EF8354]/10 px-2 py-0.5 rounded-md">{duration}s</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={duration}
                onChange={e => setDuration(parseInt(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-[10px] text-zinc-400">
                <span>1s</span>
                <span>10s</span>
              </div>
            </div>

            {/* Aspect Ratio */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-zinc-700">Aspect Ratio</label>
              <div className="flex gap-2">
                {ASPECT_RATIOS.map(ratio => (
                  <button
                    key={ratio.id}
                    onClick={() => setAspectRatio(ratio.value)}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      aspectRatio === ratio.value
                        ? 'bg-[#EF8354] text-white shadow-md'
                        : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                    }`}
                  >
                    {ratio.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Audio Toggle */}
          <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-xl">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${audio ? 'bg-[#EF8354]/10 text-[#EF8354]' : 'bg-zinc-200 text-zinc-400'}`}>
                <Music size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-700">Background Audio</p>
                <p className="text-xs text-zinc-400">Add soundtrack to video</p>
              </div>
            </div>
            <div
              className={`toggle-switch ${audio ? 'active' : ''}`}
              onClick={() => setAudio(!audio)}
            />
          </div>

          {/* Seed */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-zinc-700">Seed</label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={seed}
                onChange={e => setSeed(Number(e.target.value))}
                className="flex-1 bg-zinc-100/80 border border-zinc-200/50 rounded-xl px-4 py-2.5 text-sm font-mono text-zinc-700 focus:outline-none"
                placeholder="-1 for random"
              />
              <button
                onClick={() => setSeed(-1)}
                className="px-4 py-2.5 rounded-xl font-semibold text-sm border border-zinc-200 hover:bg-zinc-50 transition-colors"
              >
                Random
              </button>
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !hasApiKey}
            className={`w-full py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98] ${
              isGenerating || !hasApiKey
                ? 'bg-zinc-400 cursor-not-allowed shadow-none'
                : 'bg-[#EF8354] hover:bg-[#e27344] shadow-[#EF8354]/25 hover:shadow-xl text-white'
            }`}
          >
            {isGenerating ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Generating Video...
              </>
            ) : (
              <>
                <Play size={20} />
                Generate Video
              </>
            )}
          </button>

          {/* Info */}
          <div className="flex items-start gap-2 pt-2 border-t border-zinc-200/50">
            <Zap size={14} className="text-zinc-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Video generation consumes more pollen than images. Typical cost: 1-10 pollen per video depending on model and duration.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
