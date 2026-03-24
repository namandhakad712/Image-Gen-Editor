'use client';

import React from 'react';
import { X, Download, ExternalLink, Wand2, Image as ImageIcon, Calendar, Tag, Copy } from 'lucide-react';
import { HistoryItem } from '@/types';
import { toast } from 'sonner';

interface ImageModalProps {
  item: HistoryItem;
  onClose: () => void;
}

export function ImageModal({ item, onClose }: ImageModalProps) {
  const handleDownload = async () => {
    try {
      const response = await fetch(item.imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `pollinations-${item.prompt.slice(0, 30).replace(/\s+/g, '-')}.png`;
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success('Image downloaded');
    } catch (error) {
      toast.error('Failed to download');
    }
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(item.prompt);
    toast.success('Prompt copied to clipboard');
  };

  const handleOpenOriginal = () => {
    window.open(item.imageUrl, '_blank');
  };

  // Close on escape key
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-6xl max-h-[90vh] bg-white rounded-3xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#EF8354]/10 flex items-center justify-center">
              {item.type === 'generate' ? (
                <Wand2 className="h-4 w-4 text-[#EF8354]" />
              ) : (
                <ImageIcon className="h-4 w-4 text-[#EF8354]" />
              )}
            </div>
            <span className="text-sm font-semibold text-zinc-700">
              {item.type === 'generate' ? 'Generated Image' : 'Edited Image'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-zinc-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col lg:flex-row h-full max-h-[calc(90vh-80px)]">
          {/* Image */}
          <div className="flex-1 bg-zinc-100 flex items-center justify-center p-4 lg:max-w-2xl">
            <img
              src={item.imageUrl}
              alt={item.prompt}
              className="max-w-full max-h-[60vh] lg:max-h-full object-contain rounded-xl shadow-lg"
            />
          </div>

          {/* Info Panel */}
          <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
            {/* Prompt */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                  Prompt
                </label>
                <button
                  onClick={handleCopyPrompt}
                  className="text-xs font-medium text-[#EF8354] hover:text-[#e27344] flex items-center gap-1"
                >
                  <Copy size={12} />
                  Copy
                </button>
              </div>
              <p className="text-sm text-zinc-700 leading-relaxed bg-zinc-50 rounded-xl p-4">
                {item.prompt}
              </p>
            </div>

            {/* Negative Prompt */}
            {item.params?.negativePrompt && (
              <div className="mb-6">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2 block">
                  Negative Prompt
                </label>
                <p className="text-sm text-zinc-700 leading-relaxed bg-zinc-50 rounded-xl p-4">
                  {item.params.negativePrompt}
                </p>
              </div>
            )}

            {/* Metadata */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-zinc-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Tag size={14} className="text-zinc-400" />
                  <label className="text-xs font-semibold text-zinc-500 uppercase">Model</label>
                </div>
                <p className="text-sm font-medium text-zinc-800 capitalize">{item.model}</p>
              </div>

              <div className="bg-zinc-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar size={14} className="text-zinc-400" />
                  <label className="text-xs font-semibold text-zinc-500 uppercase">Created</label>
                </div>
                <p className="text-sm font-medium text-zinc-800">
                  {new Date(item.createdAt).toLocaleDateString()}
                </p>
              </div>

              {item.params?.width && item.params?.height && (
                <div className="bg-zinc-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="w-3.5 h-3.5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="2" />
                    </svg>
                    <label className="text-xs font-semibold text-zinc-500 uppercase">Size</label>
                  </div>
                  <p className="text-sm font-medium text-zinc-800">
                    {item.params.width} × {item.params.height}
                  </p>
                </div>
              )}

              {item.params?.seed && (
                <div className="bg-zinc-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="w-3.5 h-3.5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <circle cx="12" cy="12" r="10" strokeWidth="2" />
                      <path d="M12 6v6l4 2" strokeWidth="2" />
                    </svg>
                    <label className="text-xs font-semibold text-zinc-500 uppercase">Seed</label>
                  </div>
                  <p className="text-sm font-medium text-zinc-800 font-mono">{item.params.seed}</p>
                </div>
              )}
            </div>

            {/* Reference Image */}
            {item.referenceImage && (
              <div className="mb-6">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2 block">
                  Reference Image
                </label>
                <img
                  src={item.referenceImage}
                  alt="Reference"
                  className="w-full h-32 object-cover rounded-xl border border-zinc-200"
                />
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-zinc-200">
              <button
                onClick={handleDownload}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#EF8354] text-white rounded-xl font-semibold hover:bg-[#e27344] transition-colors"
              >
                <Download size={18} />
                Download
              </button>
              <button
                onClick={handleOpenOriginal}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white border border-zinc-200 text-zinc-700 rounded-xl font-semibold hover:bg-zinc-50 transition-colors"
              >
                <ExternalLink size={18} />
                Open Original
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
