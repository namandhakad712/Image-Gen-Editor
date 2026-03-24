'use client';

import { useState, useEffect } from 'react';
import { History as HistoryIcon, Trash2, Download, Eye, Filter, Search } from 'lucide-react';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Select } from '@/components/Select';
import { ImageCard } from '@/components/ImageCard';
import { ImageModal } from '@/components/ImageModal';
import { storage, formatDate } from '@/lib/utils';
import { HistoryItem } from '@/types';
import { toast } from 'sonner';

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<HistoryItem[]>([]);
  const [viewingItem, setViewingItem] = useState<HistoryItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'generate' | 'edit'>('all');
  const [filterModel, setFilterModel] = useState('all');

  useEffect(() => {
    setHistory(storage.getHistory());
  }, []);

  useEffect(() => {
    let filtered = [...history];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter((item) =>
        item.prompt.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Type filter
    if (filterType !== 'all') {
      filtered = filtered.filter((item) => item.type === filterType);
    }

    // Model filter
    if (filterModel !== 'all') {
      filtered = filtered.filter((item) => item.model === filterModel);
    }

    setFilteredHistory(filtered);
  }, [history, searchQuery, filterType, filterModel]);

  const handleDelete = (id: string) => {
    const newHistory = history.filter((item) => item.id !== id);
    setHistory(newHistory);
    storage.setHistory(newHistory);
    toast.success('Removed from history');
  };

  const handleClearAll = () => {
    if (confirm('Are you sure you want to clear all history?')) {
      setHistory([]);
      storage.clearHistory();
      toast.success('History cleared');
    }
  };

  const handleDownload = async (item: HistoryItem) => {
    try {
      const response = await fetch(item.imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pollinations-${item.id}.${item.model.includes('video') ? 'mp4' : 'png'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Download started');
    } catch (error) {
      console.error('Download failed:', error);
      window.open(item.imageUrl, '_blank');
    }
  };

  // Get unique models for filter
  const uniqueModels = Array.from(new Set(history.map((item) => item.model)));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
            <HistoryIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">History</h1>
            <p className="text-sm text-muted-foreground">
              {filteredHistory.length} of {history.length} images
            </p>
          </div>
        </div>
        {history.length > 0 && (
          <Button variant="danger" onClick={handleClearAll} className="gap-2">
            <Trash2 className="h-4 w-4" />
            Clear All
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-card rounded-xl p-4 border border-input">
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search prompts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as typeof filterType)}
            options={[
              { value: 'all', label: 'All Types' },
              { value: 'generate', label: 'Generated' },
              { value: 'edit', label: 'Edited' },
            ]}
          />
          <Select
            value={filterModel}
            onChange={(e) => setFilterModel(e.target.value)}
            options={[
              { value: 'all', label: 'All Models' },
              ...uniqueModels.map((m) => ({ value: m, label: m })),
            ]}
          />
        </div>
      </div>

      {/* Gallery */}
      {filteredHistory.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredHistory.map((item) => (
            <ImageCard
              key={item.id}
              item={item}
              onDelete={handleDelete}
              onView={setViewingItem}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="w-20 h-20 rounded-full bg-secondary mx-auto mb-4 flex items-center justify-center">
            <HistoryIcon className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {searchQuery || filterType !== 'all' || filterModel !== 'all'
              ? 'No matching results'
              : 'No history yet'}
          </h3>
          <p className="text-muted-foreground">
            {searchQuery || filterType !== 'all' || filterModel !== 'all'
              ? 'Try adjusting your filters'
              : 'Generate or edit images to see them here'}
          </p>
        </div>
      )}

      {/* Image Modal */}
      {viewingItem && (
        <ImageModal item={viewingItem} onClose={() => setViewingItem(null)} />
      )}
    </div>
  );
}
