'use client';

import { useState } from 'react';
import { Download, Trash2, Eye, Image as ImageIcon, Use } from 'lucide-react';
import { Button } from './Button';
import { HistoryItem } from '@/types';
import { formatDate } from '@/lib/utils';

interface ImageCardProps {
  item: HistoryItem;
  onDelete?: (id: string) => void;
  onView?: (item: HistoryItem) => void;
  onUseReference?: (url: string) => void;
}

export function ImageCard({ item, onDelete, onView, onUseReference }: ImageCardProps) {
  const [isLoading, setIsLoading] = useState(true);

  const handleDownload = async () => {
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
    } catch (error) {
      console.error('Download failed:', error);
      // Fallback: open in new tab
      window.open(item.imageUrl, '_blank');
    }
  };

  return (
    <div className="group relative bg-card rounded-xl overflow-hidden border border-input hover:border-primary/50 transition-all">
      {/* Image */}
      <div className="aspect-square relative overflow-hidden bg-secondary/50">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {item.model.includes('video') ? (
          <video
            src={item.imageUrl}
            className="w-full h-full object-cover"
            muted
            loop
            onMouseEnter={(e) => e.currentTarget.play()}
            onMouseLeave={(e) => e.currentTarget.pause()}
            onLoad={() => setIsLoading(false)}
          />
        ) : (
          <img
            src={item.imageUrl}
            alt={item.prompt}
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
            onLoad={() => setIsLoading(false)}
          />
        )}
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onView?.(item)}
            className="p-2"
            title="View full size"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={handleDownload}
            className="p-2"
            title="Download"
          >
            <Download className="h-4 w-4" />
          </Button>
          {onUseReference && !item.model.includes('video') && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onUseReference(item.imageUrl)}
              className="p-2"
              title="Use as reference"
            >
              <ImageIcon className="h-4 w-4" />
            </Button>
          )}
          {onDelete && (
            <Button
              size="sm"
              variant="danger"
              onClick={() => onDelete(item.id)}
              className="p-2"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Model badge */}
        <div className="absolute top-2 left-2 px-2 py-1 bg-black/70 backdrop-blur-sm rounded text-xs font-medium text-white">
          {item.model}
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-sm text-foreground line-clamp-2 mb-2">{item.prompt}</p>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{formatDate(item.createdAt)}</span>
          <span>{item.params.width}x{item.params.height}</span>
        </div>
      </div>
    </div>
  );
}
