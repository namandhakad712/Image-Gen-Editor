'use client';

import { useRef, useState, useCallback } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { Button } from './Button';

interface ImageUploadProps {
  onImageSelect: (imageUrl: string) => void;
  onImageClear: () => void;
  selectedImage?: string | null;
  accept?: string;
  label?: string;
}

export function ImageUpload({ 
  onImageSelect, 
  onImageClear, 
  selectedImage, 
  accept = 'image/*',
  label = 'Upload image'
}: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const processFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    setIsLoading(true);
    
    // For image editing, we'll use the file directly
    // In a real app, you might want to upload to a server first
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      onImageSelect(result);
      setIsLoading(false);
    };
    reader.onerror = () => {
      setIsLoading(false);
      alert('Failed to read image');
    };
    reader.readAsDataURL(file);
  }, [onImageSelect]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  if (selectedImage) {
    return (
      <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-input">
        <img
          src={selectedImage}
          alt="Selected"
          className="w-full h-full object-cover"
        />
        <button
          onClick={onImageClear}
          className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-black/90 rounded-full transition-colors"
          type="button"
        >
          <X className="h-4 w-4 text-white" />
        </button>
      </div>
    );
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      className={`w-full aspect-video border-2 border-dashed rounded-lg cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
        isDragging
          ? 'border-primary bg-accent/20'
          : 'border-input hover:border-primary/50 hover:bg-accent/10'
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
      />
      
      {isLoading ? (
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      ) : (
        <>
          <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
            <Upload className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">{label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Drag & drop or click to browse
            </p>
          </div>
        </>
      )}
    </div>
  );
}
