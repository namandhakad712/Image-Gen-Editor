'use client';

import React, { useState, useEffect } from 'react';
import {
  LayoutGrid, Wand2, Image as ImageIcon, Settings,
  Download, Trash2, Eye, ExternalLink, Sparkles,
  Search, Filter, Grid3x3, List, Calendar, Tag
} from 'lucide-react';
import { toast } from 'sonner';
import { storage } from '@/lib/utils';
import { HistoryItem } from '@/types';
import { ImageModal } from '@/components/ImageModal';

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<HistoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'generate' | 'edit'>('all');

  useEffect(() => {
    const savedHistory = storage.getHistory();
    setHistory(savedHistory);
    setFilteredHistory(savedHistory);
  }, []);

  useEffect(() => {
    let filtered = history;

    if (filterType !== 'all') {
      filtered = filtered.filter((item) => item.type === filterType);
    }

    if (searchQuery) {
      filtered = filtered.filter((item) =>
        item.prompt.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredHistory(filtered);
  }, [searchQuery, filterType, history]);

  const handleDelete = (id: string) => {
    const newHistory = history.filter((item) => item.id !== id);
    setHistory(newHistory);
    setFilteredHistory(newHistory);
    storage.setHistory(newHistory);
    toast.success('Deleted from history');
  };

  const handleClearAll = () => {
    if (confirm('Are you sure you want to clear all history?')) {
      setHistory([]);
      setFilteredHistory([]);
      storage.setHistory([]);
      toast.success('History cleared');
    }
  };

  const handleDownload = async (imageUrl: string, prompt: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `pollinations-${prompt.slice(0, 30).replace(/\s+/g, '-')}.png`;
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success('Image downloaded');
    } catch (error) {
      toast.error('Failed to download');
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-[#18181a] dark-dots p-6 md:p-8">
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#EF8354] to-purple-600 flex items-center justify-center">
              <LayoutGrid className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Gallery</h1>
              <p className="text-sm text-zinc-400">{filteredHistory.length} creations</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => window.location.href = '/'}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-sm font-medium text-white hover:bg-white/20 transition-colors"
            >
              <Wand2 size={16} />
              New Generation
            </button>
            <button
              onClick={() => window.location.href = '/edit'}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-sm font-medium text-white hover:bg-white/20 transition-colors"
            >
              <ImageIcon size={16} />
              Edit Image
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="glass-panel rounded-2xl p-4 mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="relative flex-1 w-full md:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by prompt..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white/50 border border-zinc-200 rounded-xl text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-[#EF8354]/20"
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white/50 border border-zinc-200 rounded-xl p-1">
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterType === 'all'
                    ? 'bg-[#EF8354] text-white'
                    : 'text-zinc-600 hover:bg-zinc-100'
                  }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterType('generate')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterType === 'generate'
                    ? 'bg-[#EF8354] text-white'
                    : 'text-zinc-600 hover:bg-zinc-100'
                  }`}
              >
                Generated
              </button>
              <button
                onClick={() => setFilterType('edit')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterType === 'edit'
                    ? 'bg-[#EF8354] text-white'
                    : 'text-zinc-600 hover:bg-zinc-100'
                  }`}
              >
                Edited
              </button>
            </div>

            <div className="flex items-center gap-2 bg-white/50 border border-zinc-200 rounded-xl p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-colors ${viewMode === 'grid'
                    ? 'bg-[#EF8354] text-white'
                    : 'text-zinc-600 hover:bg-zinc-100'
                  }`}
              >
                <Grid3x3 size={16} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-colors ${viewMode === 'list'
                    ? 'bg-[#EF8354] text-white'
                    : 'text-zinc-600 hover:bg-zinc-100'
                  }`}
              >
                <List size={16} />
              </button>
            </div>

            {history.length > 0 && (
              <button
                onClick={handleClearAll}
                className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-xl text-sm font-medium text-red-600 hover:bg-red-100 transition-colors"
              >
                <Trash2 size={16} />
                Clear All
              </button>
            )}
          </div>
        </div>

        {/* Gallery Grid */}
        {filteredHistory.length === 0 ? (
          <div className="glass-panel rounded-2xl p-16 text-center">
            <div className="w-20 h-20 rounded-2xl bg-[#EF8354]/10 flex items-center justify-center mx-auto mb-6">
              <Sparkles className="h-10 w-10 text-[#EF8354]" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-800 mb-2">
              {searchQuery || filterType !== 'all' ? 'No matches found' : 'No creations yet'}
            </h3>
            <p className="text-sm text-zinc-500 mb-6">
              {searchQuery || filterType !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Start creating to see your gallery here'}
            </p>
            <button
              onClick={() => (window.location.href = '/')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#EF8354] text-white rounded-xl font-semibold hover:bg-[#e27344] transition-colors"
            >
              <Sparkles size={18} />
              Create Something
            </button>
          </div>
        ) : (
          <div
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
                : 'space-y-3'
            }
          >
            {filteredHistory.map((item) => (
              <div
                key={item.id}
                className={`group glass-panel rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-[#EF8354]/10 ${viewMode === 'list' ? 'flex' : ''
                  }`}
              >
                {/* Image */}
                <div
                  className={`relative cursor-pointer ${viewMode === 'grid' ? 'aspect-square' : 'w-32 h-32 flex-shrink-0'
                    }`}
                  onClick={() => setSelectedItem(item)}
                >
                  <img
                    src={item.imageUrl}
                    alt={item.prompt}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                  {/* Type Badge */}
                  <div className="absolute top-2 left-2 px-2 py-1 bg-black/50 backdrop-blur-sm rounded-lg text-xs font-medium text-white flex items-center gap-1">
                    {item.type === 'generate' ? (
                      <Wand2 size={12} />
                    ) : (
                      <ImageIcon size={12} />
                    )}
                    {item.type === 'generate' ? 'Generated' : 'Edited'}
                  </div>

                  {/* Quick Actions */}
                  <div className="absolute top-2 right-2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(item.imageUrl, item.prompt);
                      }}
                      className="p-2 bg-white/90 backdrop-blur-sm rounded-lg text-zinc-700 hover:text-[#EF8354] transition-colors"
                      title="Download"
                    >
                      <Download size={14} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(item.id);
                      }}
                      className="p-2 bg-white/90 backdrop-blur-sm rounded-lg text-zinc-700 hover:text-red-500 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Info */}
                <div className={`p-4 ${viewMode === 'list' ? 'flex-1 flex items-center justify-between' : ''}`}>
                  <div className={viewMode === 'list' ? 'flex-1' : ''}>
                    <p className="text-sm text-zinc-700 line-clamp-2 mb-2 font-medium">
                      {item.prompt}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-zinc-500">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {formatDate(item.createdAt)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Tag size={12} />
                        {item.model}
                      </span>
                    </div>
                  </div>

                  {viewMode === 'list' && (
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => setSelectedItem(item)}
                        className="p-2 bg-[#EF8354]/10 rounded-lg text-[#EF8354] hover:bg-[#EF8354]/20 transition-colors"
                        title="View"
                      >
                        <Eye size={16} />
                      </button>
                      <a
                        href={item.imageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 bg-zinc-100 rounded-lg text-zinc-600 hover:bg-zinc-200 transition-colors"
                        title="Open Original"
                      >
                        <ExternalLink size={16} />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Image Modal */}
      {selectedItem && (
        <ImageModal item={selectedItem} onClose={() => setSelectedItem(null)} />
      )}
    </div>
  );
}
