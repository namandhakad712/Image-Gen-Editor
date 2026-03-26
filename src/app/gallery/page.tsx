'use client';

import React, { useState, useEffect } from 'react';
import {
  LayoutGrid, Settings, Wand2, History, Video, BarChart3,
  Download, ExternalLink, RefreshCw, Search,
  Images, Copy, Check
} from 'lucide-react';
import { toast } from 'sonner';

interface GalleryImage {
  id: string;
  url: string;
  prompt: string;
  model: string;
  width: number;
  height: number;
  seed: number;
  nsfw: boolean;
  status: string;
}

export default function GalleryPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  // Fetch live gallery from Pollinations
  useEffect(() => {
    fetchGallery();
  }, []);

  const fetchGallery = async () => {
    setLoading(true);
    try {
      // Using Pollinations public gallery endpoint
      const response = await fetch('https://image.pollinations.ai/feed');
      if (!response.ok) throw new Error('Failed to fetch gallery');
      const data = await response.json();
      setImages(data.slice(0, 50)); // Limit to 50 images
    } catch (error) {
      console.error('Gallery fetch error:', error);
      toast.error('Failed to load gallery. Try again later.');
    } finally {
      setLoading(false);
    }
  };

  const copyPrompt = (prompt: string) => {
    navigator.clipboard.writeText(prompt);
    setCopiedPrompt(true);
    toast.success('Prompt copied!');
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const downloadImage = async (url: string, id: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `pollinations-${id.slice(0, 8)}.jpg`;
      link.click();
      window.URL.revokeObjectURL(blobUrl);
      toast.success('Downloaded!');
    } catch {
      toast.error('Failed to download');
    }
  };

  const filteredImages = images.filter(img =>
    img.prompt.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full h-[100dvh] relative selection:bg-[#EF8354] selection:text-white overflow-auto">

      {/* Top Navigation */}
      <div className="fixed top-4 left-4 md:top-6 md:left-6 z-50">
        <div className="glass-pill rounded-full flex items-center p-1.5 pr-4 shadow-lg backdrop-blur-xl bg-white/80">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all font-semibold text-sm ${menuOpen ? 'bg-[#EF8354] text-white' : 'text-zinc-700 hover:bg-zinc-100'}`}
          >
            <LayoutGrid size={16} />
            Menu
          </button>

          {menuOpen && (
            <div className="absolute top-full left-0 mt-2 w-64 glass-panel rounded-2xl p-2 shadow-2xl backdrop-blur-xl bg-white/90 z-[60]">
              <a href="/" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-zinc-700 hover:bg-[#EF8354]/10 transition-all">
                <Wand2 size={16} className="text-[#EF8354]" /> Image Generation
              </a>
              <a href="/history" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-zinc-700 hover:bg-[#EF8354]/10 transition-all">
                <History size={16} /> My Generations
              </a>
              <a href="/video" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-zinc-700 hover:bg-[#EF8354]/10 transition-all">
                <Video size={16} /> Video Generation
              </a>
              <a href="/usage" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-zinc-700 hover:bg-[#EF8354]/10 transition-all">
                <BarChart3 size={16} /> Usage Dashboard
              </a>
              <a href="/gallery" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-[#EF8354] bg-[#EF8354]/10 transition-all">
                <Images size={16} /> Community Gallery
              </a>
              <a href="/settings" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-zinc-700 hover:bg-[#EF8354]/10 transition-all">
                <Settings size={16} /> Settings
              </a>
            </div>
          )}
        </div>
      </div>
      {menuOpen && <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto pt-28 px-4 md:px-6 pb-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-zinc-800 mb-2">Community Gallery</h1>
            <p className="text-zinc-500">Live feed of images generated by the community</p>
          </div>
          <button
            onClick={fetchGallery}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm bg-[#EF8354] text-white hover:bg-[#e27344] transition-all disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Search Bar */}
        <div className="mb-6 relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search prompts..."
            className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#EF8354]/20"
          />
        </div>

        {/* Gallery Grid */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="aspect-square rounded-2xl bg-zinc-200 animate-pulse" />
            ))}
          </div>
        ) : filteredImages.length === 0 ? (
          <div className="text-center py-20">
            <Images size={64} className="mx-auto text-zinc-300 mb-4" />
            <p className="text-lg font-semibold text-zinc-500">No images found</p>
            <p className="text-sm text-zinc-400 mt-1">Try a different search term</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredImages.map(img => (
              <div
                key={img.id}
                className="group relative aspect-square rounded-2xl overflow-hidden bg-zinc-100 cursor-pointer shadow-md hover:shadow-xl transition-all"
                onClick={() => setSelectedImage(img)}
              >
                <img
                  src={img.url}
                  alt={img.prompt}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-white text-xs line-clamp-2 font-medium">{img.prompt}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] text-white/70 px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-sm">
                        {img.model}
                      </span>
                      <span className="text-[10px] text-white/70">
                        {img.width}×{img.height}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Image Detail Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="glass-panel rounded-3xl p-6 w-full max-w-5xl bg-white/95 backdrop-blur-xl shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-6">
              <h3 className="text-xl font-bold text-zinc-800 flex items-center gap-2">
                <ExternalLink size={20} />
                Image Details
              </h3>
              <button
                onClick={() => setSelectedImage(null)}
                className="p-2 hover:bg-zinc-100 rounded-full transition-all"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Image */}
              <div className="rounded-2xl overflow-hidden bg-zinc-100">
                <img
                  src={selectedImage.url}
                  alt={selectedImage.prompt}
                  className="w-full h-auto"
                />
              </div>

              {/* Details */}
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Prompt</label>
                  <div className="mt-1 p-3 rounded-xl bg-zinc-50 border border-zinc-200">
                    <p className="text-sm text-zinc-700 leading-relaxed">{selectedImage.prompt}</p>
                  </div>
                  <button
                    onClick={() => copyPrompt(selectedImage.prompt)}
                    className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-[#EF8354] hover:underline"
                  >
                    {copiedPrompt ? <Check size={12} /> : <Copy size={12} />}
                    {copiedPrompt ? 'Copied!' : 'Copy Prompt'}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Model</label>
                    <p className="mt-1 text-sm font-medium text-zinc-700">{selectedImage.model}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Resolution</label>
                    <p className="mt-1 text-sm font-medium text-zinc-700">{selectedImage.width}×{selectedImage.height}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Seed</label>
                    <p className="mt-1 text-sm font-medium text-zinc-700 font-mono">{selectedImage.seed}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Status</label>
                    <p className="mt-1 text-sm font-medium text-zinc-700 capitalize">{selectedImage.status}</p>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => downloadImage(selectedImage.url, selectedImage.id)}
                    className="flex-1 py-3 rounded-xl font-semibold text-sm text-white bg-[#EF8354] hover:bg-[#e27344] transition-all flex items-center justify-center gap-2"
                  >
                    <Download size={16} />
                    Download
                  </button>
                  <a
                    href={selectedImage.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-3 rounded-xl font-semibold text-sm border border-zinc-200 hover:bg-zinc-50 transition-all flex items-center justify-center gap-2"
                  >
                    <ExternalLink size={16} />
                    Open
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
