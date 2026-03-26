'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutGrid, Settings, Sparkles, X, Trash2,
  Download, Clock, Search, Wand2, History as HistoryIcon,
  Video, BarChart3, CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDate, storage } from '@/lib/utils';
import { imageDB, loadImagesFromStorage, deleteImageFromStorage, clearAllImagesFromStorage } from '@/lib/imageStorage';
import { HistoryItem } from '@/types';
import { gsap } from 'gsap';

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load images from IndexedDB first, fallback to localStorage
    const loadHistory = async () => {
      const dbImages = await imageDB.getAllImages();
      if (dbImages.length > 0) {
        setHistory(dbImages);
      } else {
        // Fallback to localStorage for legacy data
        setHistory(storage.getHistory());
      }
    };
    loadHistory();
  }, []);

  // Page entrance animation
  useEffect(() => {
    const ctx = gsap.context(() => {
      // Main content entrance
      gsap.fromTo('.history-content',
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' }
      );

      // Stagger gallery grid items
      gsap.fromTo('.history-card',
        { opacity: 0, scale: 0.9, y: 20 },
        { opacity: 1, scale: 1, y: 0, duration: 0.4, stagger: 0.05, ease: 'power2.out', delay: 0.2 }
      );
    });

    return () => ctx.revert();
  }, []);

  const filteredHistory = history.filter(item =>
    item.prompt?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.model?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    // Remove from both IndexedDB and localStorage
    await imageDB.deleteImage(id);
    storage.removeFromHistory(id);
    setHistory(prev => prev.filter(item => item.id !== id));
    if (selectedItem?.id === id) setSelectedItem(null);
    toast.success('Removed from history');
  };

  const handleClearAll = async () => {
    if (confirm('Clear all history? This will delete all saved images.')) {
      await imageDB.clearAll();
      storage.clearHistory();
      setHistory([]);
      setSelectedItem(null);
      toast.success('History cleared');
    }
  };

  const handleDownload = async (url: string, id: string) => {
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

  return (
    <div className="w-full h-[100dvh] relative selection:bg-[var(--accent-color)] selection:text-white overflow-hidden">

      {/* Top-left nav pill */}
      <div className="fixed top-4 left-4 md:top-6 md:left-6 z-[70] flex items-center gap-2">
        <div className="glass-pill rounded-full flex items-center p-1.5 pr-4 shadow-sm relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors font-medium text-sm ${menuOpen ? 'bg-[var(--accent-color)]/10 text-[var(--accent-color)]' : 'text-zinc-700 hover:bg-black/5'}`}
          >
            <LayoutGrid size={16} />
            <span className="hidden sm:inline">Gallery</span>
          </button>
          <div className="w-px h-4 bg-zinc-200 mx-2"></div>
          <button onClick={() => window.location.href = '/settings'} className="p-1.5 rounded-full text-zinc-500 hover:bg-black/5 transition-colors">
            <Settings size={16} />
          </button>

          {menuOpen && (
            <div className="absolute top-full left-0 mt-2 w-56 glass-panel rounded-2xl p-2 shadow-xl animate-slide-down z-[80]">
              <a href="/" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-700 hover:bg-black/5 transition-colors">
                <Wand2 size={16} /> Image Generation
              </a>
              <a href="/history" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[var(--accent-color)] bg-[var(--accent-color)]/5 transition-colors">
                <HistoryIcon size={16} /> My Generations
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
      <div className="h-full flex flex-col md:flex-row pt-20 pb-4 px-4 md:px-6 gap-4">

        {/* Left: Gallery Grid */}
        <div ref={contentRef} className="history-content flex-1 flex flex-col gap-4 min-w-0">
          <div className="glass-panel rounded-3xl p-5 flex-1 flex flex-col gap-4 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[var(--accent-color)]/10 flex items-center justify-center text-[var(--accent-color)]">
                  <HistoryIcon size={18} />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-zinc-800">My Generations</h1>
                  <p className="text-xs text-zinc-400">{history.length} images</p>
                </div>
              </div>
              {history.length > 0 && (
                <button onClick={handleClearAll} className="text-xs font-bold text-red-400 hover:text-red-500 uppercase tracking-wider flex items-center gap-1">
                  <Trash2 size={12} /> Clear All
                </button>
              )}
            </div>

            {/* Warning Banner */}
            <div className="bg-[var(--accent-color)]/10 border border-[var(--accent-color)]/20 rounded-xl p-3 flex items-start gap-3 shrink-0">
              <Clock size={16} className="text-[var(--accent-color)] shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-zinc-700 leading-relaxed">
                  Images are stored locally in your browser cache and will be lost if you clear your data.
                  <span className="font-bold text-[var(--accent-color)] ml-1">Please download them to save safely.</span>
                </p>
              </div>
            </div>

            {/* Search */}
            <div className="relative shrink-0">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by prompt or model..."
                className="w-full bg-zinc-100/80 border border-zinc-200/50 rounded-xl py-2.5 pl-10 pr-4 text-sm text-zinc-700 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]/20"
              />
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {filteredHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-16 h-16 rounded-2xl bg-zinc-100 flex items-center justify-center mb-4">
                    <Sparkles className="text-zinc-300" size={28} />
                  </div>
                  <p className="text-sm font-medium text-zinc-500">No images yet</p>
                  <p className="text-xs text-zinc-400 mt-1">Generated images will appear here</p>
                  <a href="/" className="mt-4 px-4 py-2 rounded-xl bg-[var(--accent-color)] text-white text-sm font-semibold hover:bg-[var(--accent-color-dark)] transition-colors flex items-center gap-2">
                    <Wand2 size={14} /> Start Generating
                  </a>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {filteredHistory.map(item => (
                    <div
                      key={item.id}
                      className={`history-card aspect-square rounded-2xl overflow-hidden cursor-pointer group relative bg-zinc-100 transition-all
                        ${selectedItem?.id === item.id ? 'ring-3 ring-[var(--accent-color)] ring-offset-2' : 'hover:ring-2 hover:ring-[var(--accent-color)]/40'}`}
                      onClick={() => setSelectedItem(item)}
                    >
                      <img src={item.imageUrl} alt={item.prompt} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                        <div className="flex justify-end">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDownload(item.imageUrl, item.id); }}
                            className="p-1.5 rounded-lg bg-black/40 text-white hover:bg-[var(--accent-color)] hover:text-white transition-colors"
                            title="Download image"
                          >
                            <Download size={14} />
                          </button>
                        </div>
                        <span className="text-[10px] text-white/90 line-clamp-2 font-medium">{item.prompt}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Detail Panel */}
        {selectedItem && (
          <div className="w-full md:w-[380px] shrink-0">
            <div className="glass-panel rounded-3xl p-5 h-full flex flex-col gap-4 overflow-y-auto custom-scrollbar">
              <div className="flex items-center justify-between shrink-0">
                <h3 className="font-bold text-zinc-800">Details</h3>
                <button onClick={() => setSelectedItem(null)} className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-700 hover:bg-black/5">
                  <X size={16} />
                </button>
              </div>

              {/* Preview */}
              <div className="rounded-2xl overflow-hidden bg-zinc-100 shrink-0">
                <img src={selectedItem.imageUrl} alt={selectedItem.prompt} className="w-full object-contain max-h-[40vh]" />
              </div>

              {/* Info */}
              <div className="space-y-3 text-sm">
                <div>
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Prompt</label>
                  <p className="text-zinc-700 mt-1 leading-relaxed">{selectedItem.prompt}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Model</label>
                    <p className="text-zinc-700 mt-1 font-medium">{selectedItem.model}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Created</label>
                    <p className="text-zinc-700 mt-1 font-medium">{formatDate(selectedItem.createdAt)}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Size</label>
                    <p className="text-zinc-700 mt-1 font-medium">{selectedItem.params.width}×{selectedItem.params.height}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Seed</label>
                    <p className="text-zinc-700 mt-1 font-mono text-xs">{selectedItem.params.seed}</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-auto shrink-0">
                <button
                  onClick={() => handleDownload(selectedItem.imageUrl, selectedItem.id)}
                  className="flex-1 py-2.5 rounded-xl bg-[var(--accent-color)] text-white font-semibold text-sm hover:bg-[var(--accent-color-dark)] transition-colors flex items-center justify-center gap-2"
                >
                  <Download size={14} /> Download
                </button>
                <button
                  onClick={() => { navigator.clipboard.writeText(selectedItem.prompt); toast.success('Prompt copied!'); }}
                  className="flex-1 py-2.5 rounded-xl bg-zinc-100 text-zinc-700 font-semibold text-sm hover:bg-zinc-200 transition-colors"
                >
                  Copy Prompt
                </button>
              </div>
              <button
                onClick={() => handleDelete(selectedItem.id)}
                className="py-2 rounded-xl border border-red-200 text-red-400 font-semibold text-sm hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

