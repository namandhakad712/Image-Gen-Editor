'use client';

import { useState } from 'react';
import { X, Download, ExternalLink } from 'lucide-react';
import { HistoryItem } from '@/types';
import { Button } from './Button';

interface ImageModalProps {
  item: HistoryItem | null;
  onClose: () => void;
}

export function ImageModal({ item, onClose }: ImageModalProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  if (!item) return null;

  const handleDownload = async () => {
    setIsDownloading(true);
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
      window.open(item.imageUrl, '_blank');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="relative max-w-6xl max-h-full" onClick={(e) => e.stopPropagation()}>
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 p-2 text-white/70 hover:text-white transition-colors"
        >
          <X className="h-6 w-6" />
        </button>

        {/* Image/Video */}
        <div className="relative">
          {item.model.includes('video') ? (
            <video
              src={item.imageUrl}
              className="max-w-full max-h-[80vh] rounded-lg"
              controls
              autoPlay
              loop
            />
          ) : (
            <img
              src={item.imageUrl}
              alt={item.prompt}
              className="max-w-full max-h-[80vh] rounded-lg"
            />
          )}
        </div>

        {/* Info */}
        <div className="mt-4 flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-white font-medium line-clamp-2">{item.prompt}</p>
            <div className="flex items-center gap-3 mt-2 text-sm text-white/60">
              <span className="px-2 py-0.5 bg-white/10 rounded">{item.model}</span>
              <span>{item.params.width}x{item.params.height}</span>
              {item.params.seed && <span>Seed: {item.params.seed}</span>}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => window.open(item.imageUrl, '_blank')}
              className="gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Open
            </Button>
            <Button
              variant="primary"
              onClick={handleDownload}
              isLoading={isDownloading}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Download
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
