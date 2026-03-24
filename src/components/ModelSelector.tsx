'use client';

import { ImageModel } from '@/types';
import { Check } from 'lucide-react';

interface ModelSelectorProps {
  models: ImageModel[];
  selectedModel: string;
  onModelSelect: (model: string) => void;
}

export function ModelSelector({ models, selectedModel, onModelSelect }: ModelSelectorProps) {
  // Filter models that support image generation
  const imageModels = models.filter(
    (m) => m.output_modalities.includes('image') || m.output_modalities.includes('video')
  );

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
      {imageModels.map((model) => (
        <button
          key={model.id}
          onClick={() => onModelSelect(model.id)}
          className={`relative p-3 rounded-lg border text-left transition-all hover:border-primary/50 ${
            selectedModel === model.id
              ? 'border-primary bg-accent/50'
              : 'border-input bg-card hover:bg-accent/20'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground truncate">{model.id}</span>
            {selectedModel === model.id && (
              <Check className="h-4 w-4 text-primary flex-shrink-0 ml-1" />
            )}
          </div>
          <div className="flex gap-1 mt-1 flex-wrap">
            {model.input_modalities.includes('image') && (
              <span className="text-xs px-1.5 py-0.5 bg-primary/20 text-primary rounded">
                img
              </span>
            )}
            {model.output_modalities.includes('video') && (
              <span className="text-xs px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded">
                video
              </span>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}
