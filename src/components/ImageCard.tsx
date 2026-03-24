'use client';

import React from 'react';
import { Download, Trash2, Eye, UseReference } from 'lucide-react';
import { HistoryItem } from '@/types';
import { toast } from 'sonner';

interface ImageCardProps {
  item: HistoryItem;
  onDelete: (id: string) => void;
  onView: (item: HistoryItem) => void;
  onUseReference?: (url: string) => void;
}

export function ImageCard({ item, onDelete, onView, onUseReference }: ImageCardProps) {
  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const response = await fetch(item.imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `pollinations-${item.prompt.slice(0, 20).replace(/\s+/g, '-')}.png`;
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success('Downloaded');
    } catch (error) {
      toast.error('Failed to download');
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(item.id);
  };

  const handleUseReference = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onUseReference) {
      onUseReference(item.imageUrl);
    }
  };

  return (
    <div
      className="group relative aspect-square rounded-xl overflow-hidden bg-zinc-100 cursor-pointer"
      onClick={() => onView(item)}
    >
      <img
        src={item.imageUrl}
        alt={item.prompt}
        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
      />

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        {/* Top Actions */}
        <div className="absolute top-2 right-2 flex items-center gap-2">
          <button
            onClick={handleDownload}
            className="p-2 bg-white/90 backdrop-blur-sm rounded-lg text-zinc-700 hover:text-[#EF8354] hover:scale-110 transition-all"
            title="Download"
          >
            <Download size={14} />
          </button>
          <button
            onClick={handleDelete}
            className="p-2 bg-white/90 backdrop-blur-sm rounded-lg text-zinc-700 hover:text-red-500 hover:scale-110 transition-all"
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>

        {/* Bottom Actions */}
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
          <button
            onClick={() => onView(item)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/90 backdrop-blur-sm rounded-lg text-xs font-medium text-zinc-700 hover:bg-white transition-colors"
          >
            <Eye size={12} />
            View
          </button>
          {onUseReference && (
            <button
              onClick={handleUseReference}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#EF8354]/90 backdrop-blur-sm rounded-lg text-xs font-medium text-white hover:bg-[#EF8354] transition-colors"
            >
              <UseReference size={12} />
              Use Ref
            </button>
          )}
        </div>
      </div>

      {/* Type Badge */}
      <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-md text-xs font-medium text-white">
        {item.type === 'generate' ? '✨' : '🎨'}
      </div>
    </div>
  );
}
