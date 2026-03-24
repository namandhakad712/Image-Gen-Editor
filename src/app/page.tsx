'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  LayoutGrid, Settings, MousePointer2, Hand, PenLine,
  ImagePlus, ChevronDown, ChevronsLeft, Sparkles, Plus,
  SlidersHorizontal, Menu, X, Loader2, Trash2, Check,
  Eye, EyeOff, Download, LogIn, Key, ExternalLink,
  History, Image, Wand2, ChevronRight, Video, BarChart3,
  RotateCcw, RotateCw, Images, ArrowRightLeft
} from 'lucide-react';
import { toast } from 'sonner';
import { pollinationsAPI } from '@/lib/api';
import { storage, generateId, formatDate } from '@/lib/utils';
import { HistoryItem, GenerationParams } from '@/types';
import { ART_STYLES, STYLE_CATEGORIES, ArtStyle } from '@/lib/styles';
import { generateRandomPrompt, getRandomAppend, processPromptVariables } from '@/lib/prompts';

// =============================================
//  CONSTANTS
// =============================================
const ASPECT_RATIOS = [
  { id: '1:1', label: '1:1', shapeClass: 'shape-1-1', cssRatio: '1/1', width: 1024, height: 1024 },
  { id: '4:3', label: '4:3', shapeClass: 'shape-4-3', cssRatio: '4/3', width: 1024, height: 768 },
  { id: '16:9', label: '16:9', shapeClass: 'shape-16-9', cssRatio: '16/9', width: 1280, height: 720 },
  { id: '21:9', label: '21:9', shapeClass: 'shape-21-9', cssRatio: '21/9', width: 1512, height: 648 },
  { id: '3:4', label: '3:4', shapeClass: 'shape-3-4', cssRatio: '3/4', width: 768, height: 1024 },
  { id: '9:16', label: '9:16', shapeClass: 'shape-9-16', cssRatio: '9/16', width: 720, height: 1280 },
];

const ALL_MODIFIERS = [
  { label: 'High Resolution', prompt: 'masterpiece, best quality, ultra-detailed, 8K resolution, photorealistic, sharp focus' },
  { label: 'Studio Lighting', prompt: 'professional studio lighting, softbox lighting, dramatic shadows, three-point lighting' },
  { label: 'Minimalist', prompt: 'minimalist composition, clean lines, simple background, negative space, less is more' },
  { label: 'Cinematic', prompt: 'cinematic lighting, movie still, dramatic atmosphere, color graded, anamorphic lens' },
  { label: 'Octane Render', prompt: 'octane render, unreal engine 5, ray tracing, global illumination, photorealistic 3D' },
  { label: 'Volumetric', prompt: 'volumetric lighting, god rays, atmospheric lighting, light beams, fog and mist' },
  { label: 'Macro', prompt: 'macro photography, extreme close-up, shallow depth of field, detailed texture, bokeh' },
];

const MODIFIER_PROMPTS = ALL_MODIFIERS.reduce((acc, m) => {
  acc[m.label] = m.prompt;
  return acc;
}, {} as Record<string, string>);

const DEFAULT_MODELS = [
  { value: 'flux', label: 'Flux Schnell' },
  { value: 'zimage', label: 'Z-Image Turbo' },
  { value: 'gptimage', label: 'GPT Image 1 Mini' },
  { value: 'gptimage-large', label: 'GPT Image 1.5' },
  { value: 'nanobanana', label: 'NanoBanana' },
  { value: 'nanobanana-2', label: 'NanoBanana 2' },
  { value: 'nanobanana-pro', label: 'NanoBanana Pro' },
  { value: 'klein', label: 'FLUX.2 Klein 4B' },
  { value: 'kontext', label: 'FLUX.1 Kontext' },
  { value: 'seedream5', label: 'Seedream 5.0 Lite' },
  { value: 'seedream', label: 'Seedream 4.0' },
  { value: 'seedream-pro', label: 'Seedream 4.5 Pro' },
  { value: 'qwen-image', label: 'Qwen Image Plus' },
  { value: 'grok-imagine', label: 'Grok Imagine' },
  { value: 'grok-imagine-pro', label: 'Grok Imagine Pro' },
  { value: 'p-image', label: 'Pruna p-image' },
  { value: 'p-image-edit', label: 'Pruna p-image-edit' },
  { value: 'nova-canvas', label: 'Amazon Nova Canvas' },
];

// Helper function to filter models by supported endpoints
function filterModelsByEndpoint(models: any[], endpoint: string): any[] {
  return models.filter(m => 
    m.supported_endpoints?.includes(endpoint) || 
    m.output_modalities?.includes('image') ||
    m.output_modalities?.includes('video')
  );
}

// Filter image models (models that support image generation endpoints)
function getImageModels(models: any[]): any[] {
  return filterModelsByEndpoint(models, '/image/{prompt}')
    .filter(m => m.output_modalities?.includes('image'));
}

// Filter video models (models that output video)
function getVideoModels(models: any[]): any[] {
  return models.filter(m => 
    m.output_modalities?.includes('video') ||
    m.supported_endpoints?.includes('/video/{prompt}')
  );
}

// Filter text models (models that support text generation)
function getTextModelsForEnhancement(models: any[]): any[] {
  return models.filter(m => 
    m.supported_endpoints?.includes('/v1/chat/completions') ||
    m.supported_endpoints?.includes('/text/{prompt}')
  ).filter(m => m.output_modalities?.includes('text'));
}

const APP_REDIRECT_URL = typeof window !== 'undefined' ? window.location.origin : 'https://image-gen-editor.vercel.app';
const BYOP_AUTH_URL = 'https://enter.pollinations.ai/authorize';

// =============================================
//  MAIN COMPONENT
// =============================================
export default function SpatialImageEditor() {
  // UI State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [activeTool, setActiveTool] = useState<'pointer' | 'hand' | 'pen'>('pointer');
  const [menuOpen, setMenuOpen] = useState(false);
  const [showStyleModal, setShowStyleModal] = useState(false);
  const [customStyle, setCustomStyle] = useState('');

  // Generation State
  const [isGenerating, setIsGenerating] = useState(false);
  const [prompt, setPrompt] = useState('');

  // Canvas State - infinite canvas with multiple images
  const [canvasImages, setCanvasImages] = useState<Array<{
    id: string; url: string; x: number; y: number; width: number; height: number; prompt: string;
  }>>([]);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Pen drawing state
  const [penStrokes, setPenStrokes] = useState<Array<{
    id: string;
    points: { x: number; y: number }[];
    color: string;
    imageId?: string;
  }>>([]);
  const [penHistory, setPenHistory] = useState<Array<typeof penStrokes>>([]);
  const [penHistoryIndex, setPenHistoryIndex] = useState(-1);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<{ x: number; y: number }[]>([]);

  // Variations state
  const [generatingVariations, setGeneratingVariations] = useState<string | null>(null);
  const [variationBaseImage, setVariationBaseImage] = useState<{id: string; url: string; prompt: string} | null>(null);

  // Comparison state
  const [comparisonImages, setComparisonImages] = useState<{left: string; right: string} | null>(null);

  // Parameters
  const [aspectRatio, setAspectRatio] = useState(ASPECT_RATIOS[5]);
  const [styleStrength, setStyleStrength] = useState(75);
  const [guidanceScale, setGuidanceScale] = useState(7.5);
  const [seed, setSeed] = useState(-1);
  const [steps, setSteps] = useState(30);
  const [activeModifiers, setActiveModifiers] = useState<string[]>([]);
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState('nova-fast');
  const [penColor, setPenColor] = useState('#EF8354');
  const [enhance, setEnhance] = useState(true);
  const [safe, setSafe] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [models, setModels] = useState(DEFAULT_MODELS);
  const [selectedStyle, setSelectedStyle] = useState<ArtStyle>(ART_STYLES[0]);
  const [showStyleSelector, setShowStyleSelector] = useState(false);
  const [styleCategory, setStyleCategory] = useState<string>('All');
  
  // Batch generation
  const [batchSize, setBatchSize] = useState(1);
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);
  
  // Advanced parameters
  const [negativePrompt, setNegativePrompt] = useState('');
  const [nologo, setNologo] = useState(false);
  const [transparent, setTransparent] = useState(false);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // =============================================
  //  Live Models Fetch (Image models only)
  // =============================================
  useEffect(() => {
    fetch('https://image.pollinations.ai/models')
      .then(res => res.json())
      .then((data: any[]) => {
        // Filter for image models only based on supported_endpoints and output_modalities
        const imageModels = getImageModels(data);
        if (imageModels.length > 0) {
          setModels(imageModels.map(m => ({ value: m.name, label: m.description || m.name || m.id })));
        }
      }).catch(err => console.error('Failed to fetch models:', err));
  }, []);

  // =============================================
  //  BYOP: Grab API key from URL hash on load
  // =============================================
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.slice(1));
      const apiKey = hashParams.get('api_key');
      if (apiKey) {
        storage.setApiKey(apiKey);
        setHasApiKey(true);
        pollinationsAPI.setApiKey(apiKey);
        toast.success('Connected! API key received via Pollinations');
        window.history.replaceState(null, '', window.location.pathname);
      }
    }
    const savedKey = storage.getApiKey();
    if (savedKey) {
      setHasApiKey(true);
      pollinationsAPI.setApiKey(savedKey);
    }
  }, []);

  // =============================================
  //  INFINITE CANVAS: Pan & Zoom
  // =============================================
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    // Only pan with hand tool or middle click
    if (activeTool === 'hand' || e.button === 1) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
    // Deselect when clicking empty canvas
    if (activeTool === 'pointer' && e.target === e.currentTarget) {
      setSelectedImageId(null);
    }
  }, [activeTool, pan]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    }
  }, [isPanning, panStart]);

  const handleCanvasMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Zoom with scroll wheel
  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.08 : 0.08;
      setZoom(prev => Math.max(0.1, Math.min(5, prev + delta)));
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const panSpeed = 50 / zoom;
      
      // Arrow keys for panning
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setPan(prev => ({ ...prev, y: prev.y + panSpeed }));
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setPan(prev => ({ ...prev, y: prev.y - panSpeed }));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setPan(prev => ({ ...prev, x: prev.x + panSpeed }));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setPan(prev => ({ ...prev, x: prev.x - panSpeed }));
      }
      // Zoom with +/- keys
      else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        setZoom(prev => Math.min(5, prev + 0.1));
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        setZoom(prev => Math.max(0.1, prev - 0.1));
      }
      // Undo/Redo with Ctrl+Z / Ctrl+Shift+Z
      else if (e.ctrlKey && e.key === 'z' && activeTool === 'pen') {
        e.preventDefault();
        if (e.shiftKey) {
          redoPenStroke();
        } else {
          undoPenStroke();
        }
      }
      // Delete selected image
      else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedImageId && activeTool === 'pointer') {
          e.preventDefault();
          deleteImage(selectedImageId);
        }
      }
      // Escape to deselect
      else if (e.key === 'Escape') {
        setSelectedImageId(null);
        setActiveTool('pointer');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zoom, activeTool, selectedImageId, penHistory, penHistoryIndex]);

  // =============================================
  //  HANDLERS
  // =============================================
  const handleBYOPAuth = () => {
    const params = new URLSearchParams({ redirect_url: APP_REDIRECT_URL });
    window.location.href = `${BYOP_AUTH_URL}?${params}`;
  };

  const handleGenerate = async (singlePrompt?: string, singleStyle?: ArtStyle) => {
    if (isGenerating) return;
    const promptToUse = singlePrompt || prompt;
    const styleToUse = singleStyle || selectedStyle;
    
    if (!promptToUse.trim()) { toast.error('Please enter a prompt'); return; }
    if (!hasApiKey) { toast.error('Add your API key in Settings'); return; }

    setIsGenerating(true);
    try {
      const actualSeed = seed === -1 ? Math.floor(Math.random() * 999999999) : seed;
      
      // Process style prompt
      let fullPrompt = promptToUse;
      if (styleToUse.prompt) {
        fullPrompt = styleToUse.prompt 
          ? `${styleToUse.prompt}, ${promptToUse}`
          : promptToUse;
      }
      
      // Process variables in prompt
      fullPrompt = processPromptVariables(fullPrompt);
      
      // Combine negative prompts
      const fullNegative = negativePrompt 
        ? `${styleToUse.negative}${styleToUse.negative && negativePrompt ? ', ' : ''}${negativePrompt}`
        : styleToUse.negative;

      // Detect if this is an image edit (has reference images) or text-to-image
      const isEditMode = referenceImages.length > 0;

      let imageUrl: string;
      
      if (isEditMode) {
        // IMAGE EDIT MODE - Uses /v1/images/edits endpoint
        // Reference images are sent for editing
        imageUrl = await pollinationsAPI.editImage({
          model: selectedModel,
          prompt: fullPrompt,
          image: referenceImages.join('|'),
          seed: actualSeed,
          enhance,
          safe,
          width: aspectRatio.width,
          height: aspectRatio.height,
          negativePrompt: fullNegative || undefined,
          nologo,
          transparent: transparent && (selectedModel.includes('gptimage')),
        });
        
        toast.success('Image edited!');
      } else {
        // TEXT-TO-IMAGE MODE - Uses /image/{prompt} or /v1/images/generations
        const params: GenerationParams = {
          model: selectedModel, prompt: fullPrompt,
          width: aspectRatio.width, height: aspectRatio.height,
          seed: actualSeed, enhance, safe, quality: 'high' as const,
          negativePrompt: fullNegative || undefined,
          nologo,
          transparent: transparent && (selectedModel.includes('gptimage')),
          styleStrength,
          guidanceScale,
          steps,
        };

        // Use OpenAI endpoint when we have advanced params
        if (fullNegative || nologo || transparent || styleStrength !== 75 || guidanceScale !== 7.5 || steps !== 30) {
          imageUrl = await pollinationsAPI.generateImageOpenAI({
            prompt: fullPrompt, model: selectedModel,
            seed: actualSeed, enhance, safe,
            negative_prompt: fullNegative || undefined,
            nologo,
            transparent: transparent && (selectedModel.includes('gptimage')),
            style_strength: styleStrength !== 75 ? styleStrength : undefined,
            guidance: guidanceScale !== 7.5 ? guidanceScale : undefined,
            steps: steps !== 30 ? steps : undefined,
          });
        } else {
          imageUrl = await pollinationsAPI.generateImage(params);
        }
        
        toast.success('Image generated!');
      }

      // Place image on canvas with staggered position to avoid overlap
      const viewportCenterX = (-pan.x + window.innerWidth / 2) / zoom;
      const viewportCenterY = (-pan.y + window.innerHeight / 2) / zoom;
      
      // Calculate offset based on number of existing images
      const offset = canvasImages.length * 50;
      const staggeredX = viewportCenterX - aspectRatio.width / 2 + (offset % 300);
      const staggeredY = viewportCenterY - aspectRatio.height / 2 + Math.floor(offset / 300) * 50;

      const newImg = {
        id: generateId(), url: imageUrl,
        x: staggeredX, y: staggeredY,
        width: aspectRatio.width, height: aspectRatio.height,
        prompt: fullPrompt,
      };
      setCanvasImages(prev => [...prev, newImg]);
      setSelectedImageId(newImg.id);
      setSeed(actualSeed);

      // Save history with correct type
      const historyItem: HistoryItem = {
        id: generateId(), 
        type: isEditMode ? 'edit' : 'generate', 
        prompt: fullPrompt,
        model: selectedModel, 
        imageUrl, 
        params: {
          model: selectedModel, 
          prompt: fullPrompt,
          width: aspectRatio.width, 
          height: aspectRatio.height,
          seed: actualSeed, 
          enhance, 
          safe, 
          quality: 'high' as const,
          negativePrompt: fullNegative || undefined,
          nologo,
          transparent: transparent && (selectedModel.includes('gptimage')),
          styleStrength,
          guidanceScale,
          steps,
        }, 
        createdAt: Date.now(),
        referenceImage: isEditMode ? referenceImages[0] : undefined,
      };
      storage.setHistory([historyItem, ...storage.getHistory()].slice(0, 30));

      // Clear reference images after successful generation
      if (isEditMode) {
        setReferenceImages([]);
      }
      
      if (window.innerWidth < 768) setIsSidebarOpen(false);
    } catch (error) {
      console.error('Generation error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate image');
    } finally {
      setIsGenerating(false);
    }
  };

  // Batch generate multiple images
  const handleBatchGenerate = async () => {
    if (isBatchGenerating || batchSize <= 1) return;
    setIsBatchGenerating(true);
    
    try {
      for (let i = 0; i < batchSize; i++) {
        await handleGenerate();
        // Small delay between generations
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      toast.success(`Generated ${batchSize} images!`);
    } catch (error) {
      console.error('Batch generation error:', error);
      toast.error('Batch generation failed');
    } finally {
      setIsBatchGenerating(false);
    }
  };

  // Random prompt
  const handleRandomPrompt = () => {
    const randomPrompt = generateRandomPrompt();
    setPrompt(randomPrompt);
    toast.success('Random prompt loaded!');
  };

  const processFiles = (files: File[]) => {
    const availableSlots = 4 - referenceImages.length;
    const filesToUpload = files.slice(0, availableSlots);
    
    if (filesToUpload.length === 0) {
      if (files.length > 0) toast.error('Maximum 4 reference images allowed');
      return;
    }

    filesToUpload.forEach(file => {
      if (!file.type.startsWith('image/')) {
        toast.error('Only images are allowed');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setReferenceImages(prev => {
          if (prev.length >= 4) return prev;
          return [...prev, event.target?.result as string];
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(Array.from(e.target.files || []));
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    processFiles(Array.from(e.dataTransfer.files));
  };

  const handleAddUrl = () => {
    const url = window.prompt("Enter image URL:");
    if (!url) return;
    if (referenceImages.length >= 4) {
      toast.error('Maximum 4 reference images allowed');
      return;
    }
    setReferenceImages(prev => [...prev, url]);
  };

  const removeReferenceImage = (index: number) => {
    setReferenceImages(prev => prev.filter((_, i) => i !== index));
    toast.success('Image removed');
  };

  const toggleModifier = (mod: string) => {
    setActiveModifiers(prev => {
      if (prev.includes(mod)) {
        return prev.filter(m => m !== mod);
      } else {
        // Insert the modifier's prompt directly into the main prompt
        setPrompt(currentPrompt => {
          if (currentPrompt.includes(MODIFIER_PROMPTS[mod])) {
            return currentPrompt;
          }
          return currentPrompt ? `${currentPrompt}, ${MODIFIER_PROMPTS[mod]}` : MODIFIER_PROMPTS[mod];
        });
        return [...prev, mod];
      }
    });
  };

  const handleAddCustomStyle = () => {
    if (customStyle.trim()) {
      setPrompt(prev => prev ? `${prev}, ${customStyle.trim()}` : customStyle.trim());
      setCustomStyle('');
      setShowStyleModal(false);
      toast.success('Style added!');
    }
  };

  // Generate variations of an image
  const generateVariations = async (image: {id: string; url: string; prompt: string}) => {
    if (!hasApiKey) { toast.error('Add API key first'); return; }
    setGeneratingVariations(image.id);
    setVariationBaseImage(image);
    
    try {
      const baseSeed = Math.floor(Math.random() * 999999999);
      const variations = [];
      
      // Generate 4 variations with different seeds
      for (let i = 0; i < 4; i++) {
        const variationSeed = baseSeed + i * 1000;
        const canvasImg = canvasImages.find(img => img.id === image.id);
        const params: GenerationParams = {
          model: selectedModel,
          prompt: image.prompt,
          width: canvasImg?.width || 1024,
          height: canvasImg?.height || 1024,
          seed: variationSeed,
          enhance,
          safe,
          quality: 'high' as const,
        };
        
        const imageUrl = await pollinationsAPI.generateImage(params);
        variations.push({
          id: generateId(),
          url: imageUrl,
          prompt: image.prompt,
          width: params.width,
          height: params.height,
          x: 0, y: 0,
        });
      }
      
      // Add variations to canvas in a grid
      const startX = (-pan.x + window.innerWidth / 2) / zoom - 200;
      const startY = (-pan.y + window.innerHeight / 2) / zoom + 300;
      
      variations.forEach((v, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        v.x = startX + col * 250;
        v.y = startY + row * 250;
        setCanvasImages(prev => [...prev, v]);
      });
      
      toast.success('4 variations generated!');
    } catch (error) {
      console.error('Variation error:', error);
      toast.error('Failed to generate variations');
    } finally {
      setGeneratingVariations(null);
    }
  };

  // Open comparison view
  const openComparison = (image1: string, image2: string) => {
    setComparisonImages({ left: image1, right: image2 });
  };

  // Undo/Redo for pen strokes
  const undoPenStroke = () => {
    if (penHistoryIndex >= 0) {
      const newHistory = penHistory.slice(0, penHistoryIndex);
      setPenStrokes(newHistory[penHistoryIndex] || []);
      setPenHistoryIndex(prev => prev - 1);
    }
  };

  const redoPenStroke = () => {
    if (penHistoryIndex < penHistory.length - 1) {
      const newIndex = penHistoryIndex + 1;
      setPenStrokes(penHistory[newIndex] || []);
      setPenHistoryIndex(newIndex);
    }
  };

  // Save pen stroke to history
  const savePenStroke = (strokes: typeof penStrokes) => {
    const newHistory = penHistory.slice(0, penHistoryIndex + 1);
    newHistory.push(strokes);
    setPenHistory(newHistory);
    setPenHistoryIndex(newHistory.length - 1);
  };

  const downloadImage = async (url: string, id: string) => {
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

  const deleteImage = (id: string) => {
    setCanvasImages(prev => prev.filter(img => img.id !== id));
    if (selectedImageId === id) setSelectedImageId(null);
    toast.success('Removed from canvas');
  };

  const resetView = () => { setPan({ x: 0, y: 0 }); setZoom(1); };

  // =============================================
  //  DRAWING LOGIC (with undo/redo and image support)
  // =============================================
  useEffect(() => {
    if (activeTool !== 'pen' || !drawingCanvasRef.current) return;
    const canvas = drawingCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => { 
      canvas.width = canvas.offsetWidth; 
      canvas.height = canvas.offsetHeight; 
      // Redraw all strokes after resize
      redrawAllStrokes();
    };
    resize();

    const redrawAllStrokes = () => {
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      penStrokes.forEach(stroke => {
        if (stroke.points.length < 2) return;
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
        ctx.stroke();
      });
    };

    const getCanvasCoords = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      const cx = 'touches' in e ? e.touches[0]?.clientX : e.clientX;
      const cy = 'touches' in e ? e.touches[0]?.clientY : e.clientY;
      return { 
        x: (cx || 0) - rect.left, 
        y: (cy || 0) - rect.top 
      };
    };

    const startDrawing = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      setIsDrawing(true);
      const point = getCanvasCoords(e);
      setCurrentStroke([point]);
      
      ctx.strokeStyle = penColor;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(point.x, point.y);
    };

    const draw = (e: MouseEvent | TouchEvent) => {
      if (!isDrawing) return;
      e.preventDefault();
      const point = getCanvasCoords(e);
      setCurrentStroke(prev => [...prev, point]);
      
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
    };

    const stopDrawing = () => {
      if (!isDrawing) return;
      setIsDrawing(false);
      
      if (currentStroke.length > 0) {
        const newStroke = {
          id: generateId(),
          points: currentStroke,
          color: penColor,
          imageId: selectedImageId || undefined,
        };
        const newStrokes = [...penStrokes, newStroke];
        setPenStrokes(newStrokes);
        savePenStroke(newStrokes);
      }
      setCurrentStroke([]);
      ctx.beginPath();
    };

    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);
    canvas.addEventListener('touchstart', startDrawing, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    canvas.addEventListener('touchend', stopDrawing);
    
    return () => {
      canvas.removeEventListener('mousedown', startDrawing);
      canvas.removeEventListener('mousemove', draw);
      canvas.removeEventListener('mouseup', stopDrawing);
      canvas.removeEventListener('mouseout', stopDrawing);
      canvas.removeEventListener('touchstart', startDrawing);
      canvas.removeEventListener('touchmove', draw);
      canvas.removeEventListener('touchend', stopDrawing);
    };
  }, [activeTool, penColor, isDrawing, currentStroke, penStrokes, selectedImageId]);

  // =============================================
  //  RENDER
  // =============================================
  return (
    <div className="w-full h-[100dvh] relative selection:bg-[#EF8354] selection:text-white overflow-hidden">

      {/* =========================================
          INFINITE CANVAS (full viewport)
      ========================================= */}
      <div
        ref={canvasContainerRef}
        className={`infinite-canvas ${activeTool === 'hand' ? 'cursor-grab' : activeTool === 'pen' ? 'cursor-crosshair' : 'cursor-default'} ${isPanning ? '!cursor-grabbing' : ''}`}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onMouseLeave={handleCanvasMouseUp}
      >
        <div
          className="canvas-transform"
          style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
        >
          {/* Canvas Images */}
          {canvasImages.map((img, index) => (
            <div
              key={img.id}
              className={`absolute group transition-all duration-300 ${
                selectedImageId === img.id 
                  ? 'ring-4 ring-[#EF8354] ring-offset-3 ring-offset-white/30 shadow-2xl shadow-[#EF8354]/20' 
                  : 'hover:ring-2 hover:ring-[#EF8354]/40 hover:shadow-xl'
              }`}
              style={{ 
                left: img.x, 
                top: img.y, 
                width: img.width, 
                height: img.height,
                zIndex: selectedImageId === img.id ? 50 : index,
              }}
              onClick={(e) => { e.stopPropagation(); if (activeTool === 'pointer') setSelectedImageId(img.id); }}
            >
              <img 
                src={img.url} 
                alt={img.prompt} 
                className="w-full h-full object-cover rounded-2xl shadow-lg backdrop-blur-sm" 
                draggable={false} 
              />

              {/* Hover actions - responsive size based on image */}
              <div className={`absolute -top-3 right-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 ${
                img.width < 400 ? 'scale-75' : img.width < 800 ? 'scale-90' : 'scale-100'
              }`}>
                {/* Variations button */}
                <button
                  onClick={(e) => { e.stopPropagation(); generateVariations({id: img.id, url: img.url, prompt: img.prompt}); }}
                  disabled={generatingVariations === img.id}
                  className="px-3 py-1.5 rounded-full glass-panel text-xs font-semibold text-zinc-700 hover:text-[#EF8354] hover:bg-white/80 transition-all flex items-center gap-1.5 shadow-lg backdrop-blur-md disabled:opacity-50"
                >
                  {generatingVariations === img.id ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Images size={12} />
                  )}
                  <span className="hidden sm:inline">{generatingVariations === img.id ? '...' : 'Variations'}</span>
                </button>
                
                <button
                  onClick={(e) => { e.stopPropagation(); downloadImage(img.url, img.id); }}
                  className="px-3 py-1.5 rounded-full glass-panel text-xs font-semibold text-zinc-700 hover:text-[#EF8354] hover:bg-white/80 transition-all flex items-center gap-1.5 shadow-lg backdrop-blur-md"
                >
                  <Download size={12} />
                  <span className="hidden sm:inline">Download</span>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteImage(img.id); }}
                  className="p-1.5 rounded-full glass-panel text-zinc-600 hover:text-red-500 hover:bg-red-50/80 transition-all shadow-lg backdrop-blur-md"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {/* Dimension badge */}
              <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-full glass-panel text-[10px] font-semibold text-zinc-600 opacity-0 group-hover:opacity-100 transition-all backdrop-blur-md shadow-md">
                {img.width}×{img.height}
              </div>

              {/* Selection indicator */}
              {selectedImageId === img.id && (
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-[#EF8354] text-white text-[10px] font-bold uppercase tracking-wider shadow-lg">
                  Selected
                </div>
              )}
            </div>
          ))}

          {/* Drawing overlay - sits on entire canvas */}
          {activeTool === 'pen' && (
            <canvas
              ref={drawingCanvasRef}
              className="absolute touch-none pointer-events-none"
              style={{ 
                left: -5000, 
                top: -5000, 
                width: 10000, 
                height: 10000,
                zIndex: 100,
              }}
            />
          )}
        </div>

        {/* Empty State (centered in viewport) */}
        {canvasImages.length === 0 && !isGenerating && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center select-none">
              <div className="w-20 h-20 rounded-3xl bg-[#EF8354]/10 flex items-center justify-center mx-auto mb-5">
                <Wand2 size={36} className="text-[#EF8354]" />
              </div>
              <h2 className="text-xl font-bold text-zinc-700 mb-2">Start Creating</h2>
              <p className="text-sm text-zinc-400 max-w-[300px] mx-auto">Enter a prompt and click Generate.<br/>Scroll to zoom · Drag with Hand tool to pan</p>
            </div>
          </div>
        )}

        {/* Generating indicator (centered in viewport) */}
        {isGenerating && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div className="glass-panel rounded-3xl px-8 py-6 flex flex-col items-center gap-3 animate-fade-in">
              <Loader2 className="animate-spin text-[#EF8354]" size={36} />
              <span className="font-semibold text-zinc-700 text-sm">Synthesizing {aspectRatio.label} Image...</span>
            </div>
          </div>
        )}
      </div>


      {/* =========================================
          TOP-LEFT: MENU PILL
      ========================================= */}
      <div className="fixed top-4 left-4 md:top-6 md:left-6 z-50 flex items-center gap-2">
        <div className="glass-pill rounded-full flex items-center p-1.5 pr-2 md:pr-4 shadow-sm relative">
          {/* Mobile sidebar toggle */}
          <button
            className="md:hidden p-2 rounded-full hover:bg-black/5 text-zinc-700 transition-colors"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="hidden md:block w-px h-4 bg-zinc-200 mx-1"></div>

          {/* Gallery / Menu button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors font-medium text-sm ${menuOpen ? 'bg-[#EF8354]/10 text-[#EF8354]' : 'text-zinc-700 hover:bg-black/5'}`}
          >
            <LayoutGrid size={16} />
            <span className="hidden sm:inline">Menu</span>
          </button>
          <div className="w-px h-4 bg-zinc-200 mx-2"></div>
          <button
            onClick={() => window.location.href = '/settings'}
            className="p-1.5 rounded-full text-zinc-500 hover:bg-black/5 transition-colors"
          >
            <Settings size={16} />
          </button>

          {/* Dropdown Menu */}
          {menuOpen && (
            <div className="absolute top-full left-0 mt-2 w-56 glass-panel rounded-2xl p-2 shadow-xl animate-slide-down z-[60]">
              <a href="/" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[#EF8354] bg-[#EF8354]/5 transition-colors">
                <Wand2 size={16} /> Image Generation
              </a>
              <a href="/history" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-700 hover:bg-black/5 transition-colors">
                <History size={16} /> History / Gallery
              </a>
              <a href="/edit" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-700 hover:bg-black/5 transition-colors">
                <ImagePlus size={16} /> Image Editor
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
              <div className="h-px bg-zinc-200/50 my-1.5"></div>
              <div className="px-3 py-2 flex items-center justify-between">
                <span className="text-xs text-zinc-400">Zoom: {Math.round(zoom * 100)}%</span>
                <button onClick={resetView} className="text-xs font-semibold text-[#EF8354] hover:underline">Reset View</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Close menu backdrop */}
      {menuOpen && <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />}

      {/* Sidebar Toggle Button (when closed) */}
      {!isSidebarOpen && (
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="fixed top-1/2 left-4 md:left-6 -translate-y-1/2 z-30 p-3 glass-panel rounded-full shadow-lg hover:scale-110 transition-all backdrop-blur-xl bg-white/80 group"
        >
          <ChevronRight size={20} className="text-zinc-600 group-hover:text-[#EF8354] transition-colors" />
        </button>
      )}


      {/* =========================================
          TOP-RIGHT: TOOL BUTTONS
      ========================================= */}
      <div className="fixed top-4 right-4 md:top-6 md:right-6 z-50">
        <div className="glass-pill rounded-full flex flex-row md:flex-col items-center p-1.5 md:p-2 gap-1 md:gap-2">
          <button
            onClick={() => setActiveTool('pointer')}
            className={`p-2 rounded-full transition-colors ${activeTool === 'pointer' ? 'bg-[#EF8354]/10 text-[#EF8354]' : 'text-zinc-500 hover:text-black hover:bg-black/5'}`}
          >
            <MousePointer2 size={18} />
          </button>
          <button
            onClick={() => setActiveTool('hand')}
            className={`p-2 rounded-full transition-colors ${activeTool === 'hand' ? 'bg-[#EF8354]/10 text-[#EF8354]' : 'text-zinc-500 hover:text-black hover:bg-black/5'}`}
          >
            <Hand size={18} />
          </button>
          <button
            onClick={() => setActiveTool('pen')}
            className={`p-2 rounded-full transition-colors ${activeTool === 'pen' ? 'bg-[#EF8354]/10 text-[#EF8354]' : 'text-zinc-500 hover:text-black hover:bg-black/5'}`}
          >
            <PenLine size={18} />
          </button>

          {activeTool === 'pen' && (
            <>
              <div className="w-px h-4 bg-zinc-200 mx-1"></div>
              <div className="flex items-center gap-1.5 px-2">
                {['#EF8354', '#2D3142', '#4F5D75', '#BFC0C0', '#FFFFFF', '#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'].slice(0, 8).map(c => (
                  <button
                    key={c}
                    onClick={() => setPenColor(c)}
                    className={`w-4 h-4 rounded-full border border-zinc-200 transition-transform ${penColor === c ? 'scale-125 ring-2 ring-[#EF8354]/20' : 'hover:scale-110'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>


      {/* =========================================
          LEFT PANEL: PARAMETERS SIDEBAR
      ========================================= */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/10 backdrop-blur-sm z-40 md:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      <aside className={`fixed top-20 bottom-56 md:top-24 md:bottom-40 left-4 md:left-6 w-[300px] md:w-[340px] glass-panel rounded-[28px] p-5 md:p-6 z-50 flex flex-col gap-4 custom-scrollbar overflow-y-auto transition-all duration-300 ease-out backdrop-blur-xl bg-white/70 border border-white/20
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-[120%] md:-translate-x-[120%]'}`}>

        {/* Close button for mobile */}
        <div className="flex items-center justify-between pb-1 shrink-0">
          <h2 className="text-lg font-bold text-zinc-800">Parameters</h2>
          <button className="text-zinc-400 hover:text-zinc-600" onClick={() => setIsSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        {/* Reference Image */}
        <section className="space-y-3 shrink-0">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <label className="text-sm font-semibold text-zinc-700">Reference Image</label>
              {referenceImages.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-[#EF8354]/10 text-[#EF8354] text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                  <Sparkles size={8} />
                  Edit Mode
                </span>
              )}
            </div>
            {referenceImages.length > 0 ? (
              <button onClick={() => setReferenceImages([])} className="text-[11px] font-bold text-red-400 hover:text-red-500 uppercase tracking-wider flex items-center gap-1">
                <Trash2 size={12} /> Clear All
              </button>
            ) : (
              <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">Optional</span>
            )}
          </div>
          
          {referenceImages.length > 0 && (
            <div className="p-3 rounded-xl bg-[#EF8354]/5 border border-[#EF8354]/20">
              <p className="text-[10px] text-zinc-600 leading-relaxed">
                <strong className="text-[#EF8354]">Image Edit Mode:</strong> The AI will edit your reference image based on your prompt. Uses /v1/images/edits endpoint.
              </p>
            </div>
          )}
          
          {referenceImages.length > 0 && (
            <div className="grid grid-cols-2 gap-2 mb-3">
              {referenceImages.map((imgUrl, i) => (
                <div key={i} className="relative aspect-square rounded-xl overflow-hidden group">
                  <img src={imgUrl} alt={`Ref ${i+1}`} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button onClick={(e) => { e.stopPropagation(); removeReferenceImage(i); }} className="p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {referenceImages.length < 4 && (
            <div
              className={`w-full ${referenceImages.length > 0 ? 'aspect-[4/1]' : 'aspect-[4/2.5]'} rounded-2xl border-2 border-dashed border-zinc-200 bg-white/40 flex flex-col items-center justify-center cursor-pointer hover:border-[#EF8354]/50 hover:bg-white/60 transition-all group relative overflow-hidden`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" multiple className="hidden" />
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#EF8354]/10 flex items-center justify-center text-[#EF8354] group-hover:scale-110 transition-transform">
                  <ImagePlus size={20} />
                </div>
                {!referenceImages.length ? (
                  <div className="text-left">
                    <span className="text-sm font-semibold text-zinc-700 block">Drop images here</span>
                    <span className="text-xs text-zinc-400 leading-none">Up to 4 images</span>
                  </div>
                ) : (
                  <span className="text-sm font-semibold text-zinc-700">Add more</span>
                )}
              </div>
            </div>
          )}
          
          <button 
             onClick={(e) => { e.stopPropagation(); handleAddUrl(); }} 
             className={`w-full text-xs font-semibold py-2.5 rounded-xl border border-zinc-200/50 bg-white/40 hover:bg-[#EF8354]/5 hover:text-[#EF8354] transition-all
               ${referenceImages.length >= 4 ? 'hidden' : 'block'}`}
          >
            Or paste image URL
          </button>
        </section>

        {/* Aspect Ratio */}
        <section className="space-y-3 shrink-0">
          <label className="text-sm font-semibold text-zinc-700 flex justify-between">
            Aspect Ratio <span className="text-[#EF8354] font-bold">{aspectRatio.label}</span>
          </label>
          <div className="bg-zinc-100/80 p-1.5 rounded-2xl flex items-center gap-1 border border-zinc-200/50 overflow-x-auto custom-scrollbar">
            {ASPECT_RATIOS.map(ratio => (
              <button
                key={ratio.id}
                onClick={() => setAspectRatio(ratio)}
                className={`flex-1 min-w-[48px] flex flex-col justify-center items-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all shrink-0
                  ${aspectRatio.id === ratio.id ? 'bg-white shadow-sm text-[#EF8354] border border-[#EF8354]/20' : 'text-zinc-500 hover:text-zinc-700 hover:bg-white/50'}`}
              >
                <div className={ratio.shapeClass}></div>
                <span>{ratio.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Model */}
        <section className="space-y-3 shrink-0">
          <label className="text-sm font-semibold text-zinc-700">Model</label>
          <div className="relative">
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full appearance-none bg-zinc-100/80 border border-zinc-200/50 rounded-xl py-3 px-4 text-sm font-semibold text-zinc-700 focus:outline-none focus:ring-2 focus:ring-[#EF8354]/20 cursor-pointer"
            >
              {models.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
            <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
          </div>
        </section>

        {/* Art Style */}
        <section className="space-y-3 shrink-0">
          <label className="text-sm font-semibold text-zinc-700">Art Style</label>
          <button
            onClick={() => setShowStyleSelector(true)}
            className="w-full p-3 rounded-xl bg-zinc-100/80 border border-zinc-200 text-left text-sm font-semibold text-zinc-700 hover:border-[#EF8354]/50 transition-all flex items-center justify-between"
          >
            <span>{selectedStyle.label}</span>
            <ChevronDown size={16} />
          </button>
          {selectedStyle.id !== 'no-style' && (
            <button
              onClick={() => setSelectedStyle(ART_STYLES[0])}
              className="text-xs text-zinc-400 hover:text-red-500 transition-colors flex items-center gap-1"
            >
              <X size={12} /> Remove style
            </button>
          )}
        </section>

        {/* Sliders */}
        <section className="space-y-5 shrink-0">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-semibold text-zinc-700">Style Strength</label>
              <span className="text-xs font-bold text-[#EF8354] bg-[#EF8354]/10 border border-[#EF8354]/20 px-2 py-0.5 rounded-md">{styleStrength}%</span>
            </div>
            <input type="range" min="0" max="100" value={styleStrength} onChange={e => setStyleStrength(parseInt(e.target.value))} />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-semibold text-zinc-700">Guidance Scale</label>
              <span className="text-xs font-bold text-zinc-600 bg-zinc-100 border border-zinc-200 px-2 py-0.5 rounded-md">{guidanceScale.toFixed(1)}</span>
            </div>
            <input type="range" min="1" max="20" step="0.1" value={guidanceScale} onChange={e => setGuidanceScale(parseFloat(e.target.value))} />
          </div>
        </section>

        {/* Toggles */}
        <section className="space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-zinc-700">Enhance</label>
            <div className={`toggle-switch ${enhance ? 'active' : ''}`} onClick={() => setEnhance(!enhance)} />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-zinc-700">Safe Mode</label>
            <div className={`toggle-switch ${safe ? 'active' : ''}`} onClick={() => setSafe(!safe)} />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-zinc-700">No Logo</label>
            <div className={`toggle-switch ${nologo ? 'active' : ''}`} onClick={() => setNologo(!nologo)} />
          </div>
          {selectedModel.includes('gptimage') && (
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-zinc-700">Transparent BG</label>
              <div className={`toggle-switch ${transparent ? 'active' : ''}`} onClick={() => setTransparent(!transparent)} />
            </div>
          )}
        </section>

        {/* Advanced Settings */}
        <section className="pt-3 border-t border-zinc-200/50 mt-auto shrink-0">
          <button className="flex items-center justify-between w-full text-zinc-500 hover:text-zinc-800 transition-colors py-2" onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}>
            <div className="flex items-center gap-2">
              <SlidersHorizontal size={16} />
              <span className="text-sm font-semibold">Advanced Settings</span>
            </div>
            <ChevronDown size={16} className={`transition-transform duration-300 ${isAdvancedOpen ? 'rotate-180' : ''}`} />
          </button>
          <div className={`overflow-hidden transition-all duration-300 ${isAdvancedOpen ? 'max-h-[400px] opacity-100 mt-3' : 'max-h-0 opacity-0'}`}>
            <div className="space-y-4 pb-2">
              {/* Negative Prompt */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-600">Negative Prompt</label>
                <textarea
                  value={negativePrompt}
                  onChange={e => setNegativePrompt(e.target.value)}
                  className="w-full bg-zinc-100/80 border border-zinc-200/50 rounded-lg px-3 py-2 text-xs text-zinc-700 focus:outline-none focus:ring-2 focus:ring-[#EF8354]/20 resize-none"
                  placeholder="What to avoid in the image..."
                  rows={2}
                />
              </div>
              
              <div className="flex items-center justify-between gap-4">
                <label className="text-xs font-semibold text-zinc-600 shrink-0">Seed</label>
                <div className="flex flex-1 items-center bg-zinc-100/80 rounded-lg px-3 py-1.5 border border-zinc-200/50">
                  <input type="number" value={seed} onChange={e => setSeed(Number(e.target.value))} className="w-full bg-transparent text-xs font-mono text-zinc-700 focus:outline-none" placeholder="-1 = random" />
                </div>
              </div>
              <div className="flex items-center justify-between gap-4">
                <label className="text-xs font-semibold text-zinc-600 shrink-0">Steps</label>
                <input type="range" min="1" max="100" value={steps} onChange={e => setSteps(parseInt(e.target.value))} className="flex-1" />
                <span className="text-xs font-bold text-zinc-600 w-6 text-right">{steps}</span>
              </div>
            </div>
          </div>
        </section>

      </aside>


      {/* =========================================
          BOTTOM PANEL: PROMPT & GENERATE
      ========================================= */}
      <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center pointer-events-none">
        <div className="glass-panel rounded-t-[32px] rounded-b-none p-4 md:p-6 w-full max-w-4xl mx-auto pointer-events-auto shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.2)] backdrop-blur-xl bg-white/70 border-t border-white/20">

          {/* Pen tools - show when pen is active */}
          {activeTool === 'pen' && (
            <div className="flex items-center justify-center gap-2 mb-3 pb-3 border-b border-zinc-200/50">
              <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mr-2">Drawing Tools:</span>
              <button
                onClick={undoPenStroke}
                disabled={penHistoryIndex < 0}
                className="px-3 py-1.5 rounded-full bg-zinc-100/80 hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 text-xs font-semibold text-zinc-600"
              >
                <RotateCcw size={12} />
                Undo
              </button>
              <button
                onClick={redoPenStroke}
                disabled={penHistoryIndex >= penHistory.length - 1}
                className="px-3 py-1.5 rounded-full bg-zinc-100/80 hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 text-xs font-semibold text-zinc-600"
              >
                <RotateCw size={12} />
                Redo
              </button>
              <button
                onClick={() => { setPenStrokes([]); setPenHistory([]); setPenHistoryIndex(-1); toast.success('Canvas cleared'); }}
                className="px-3 py-1.5 rounded-full bg-red-100/80 hover:bg-red-200 transition-all flex items-center gap-1.5 text-xs font-semibold text-red-600"
              >
                <Trash2 size={12} />
                Clear All
              </button>
              <div className="w-px h-4 bg-zinc-200 mx-2"></div>
              <span className="text-[10px] font-medium text-zinc-400">Draw on images to mark edit areas</span>
            </div>
          )}

          {/* Random Prompt & Batch Controls */}
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={handleRandomPrompt}
              className="px-3 py-1.5 rounded-full bg-zinc-100 hover:bg-zinc-200 transition-all flex items-center gap-1.5 text-xs font-semibold text-zinc-600"
            >
              <Sparkles size={12} />
              Random Prompt
            </button>

            <select
              value={batchSize}
              onChange={e => setBatchSize(parseInt(e.target.value))}
              className="px-3 py-1.5 rounded-full bg-zinc-100 border border-zinc-200 text-xs font-semibold text-zinc-600 focus:outline-none"
            >
              <option value={1}>1 image</option>
              <option value={2}>2 images</option>
              <option value={4}>4 images</option>
              <option value={6}>6 images</option>
              <option value={8}>8 images</option>
            </select>

            {batchSize > 1 && (
              <button
                onClick={handleBatchGenerate}
                disabled={isBatchGenerating}
                className="px-4 py-1.5 rounded-full bg-[#EF8354] hover:bg-[#e27344] disabled:bg-zinc-300 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 text-xs font-bold text-white"
              >
                <Sparkles size={12} />
                Generate All
              </button>
            )}
          </div>

          <div className="flex flex-col md:flex-row items-stretch md:items-start gap-3 md:gap-4">
            <div className="flex-1 relative bg-white/40 md:bg-transparent rounded-2xl md:rounded-none p-3 md:p-0">
              <textarea
                className="w-full bg-transparent resize-none text-zinc-700 text-sm md:text-base leading-relaxed focus:outline-none placeholder:text-zinc-400 h-20 md:h-16 prompt-scrollbar"
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder="Describe what you want to see..."
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleGenerate(); } }}
              />
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); handleGenerate(); }}
              disabled={isGenerating}
              className={`text-white px-6 py-4 rounded-2xl font-bold text-sm md:text-base flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 shrink-0 h-[60px] md:h-16
                ${isGenerating ? 'bg-zinc-400 shadow-none cursor-not-allowed' : 'bg-[#EF8354] hover:bg-[#e27344] shadow-[#EF8354]/25 hover:shadow-xl hover:shadow-[#EF8354]/30'}`}
            >
              {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
              {isGenerating ? 'Synthesizing...' : 'Generate'}
            </button>
          </div>

          {/* Modifiers row */}
          <div className="flex items-center justify-between pt-3 border-t border-zinc-200/50">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar w-full md:w-auto">
              <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide shrink-0">Style:</span>
              {ALL_MODIFIERS.map(mod => {
                const isActive = activeModifiers.includes(mod.label);
                return (
                  <button key={mod.label} onClick={() => toggleModifier(mod.label)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm whitespace-nowrap transition-all border shrink-0 backdrop-blur-sm
                      ${isActive ? 'bg-[#EF8354] text-white border-[#EF8354] shadow-md' : 'bg-white/60 text-zinc-600 border-zinc-200 hover:border-[#EF8354]/50 hover:bg-white/80'}`}
                  >
                    {isActive && <Check size={10} strokeWidth={3} />}
                    {mod.label}
                  </button>
                );
              })}
              <button
                onClick={() => setShowStyleModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm whitespace-nowrap transition-all border border-dashed border-zinc-300 shrink-0 hover:border-[#EF8354]/50 hover:bg-[#EF8354]/5"
              >
                <Plus size={12} /> Add Style
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Style Modal */}
      {showStyleModal && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-4 bg-black/20 backdrop-blur-sm" onClick={() => setShowStyleModal(false)}>
          <div className="glass-panel rounded-t-3xl md:rounded-3xl p-6 w-full max-w-md bg-white/90 backdrop-blur-xl shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-zinc-800">Add Custom Style</h3>
              <button onClick={() => setShowStyleModal(false)} className="p-2 hover:bg-zinc-100 rounded-full transition-all">
                <X size={18} />
              </button>
            </div>
            <textarea
              value={customStyle}
              onChange={e => setCustomStyle(e.target.value)}
              placeholder="Enter style keywords, e.g., 'cyberpunk, neon lights, futuristic city'..."
              className="w-full h-32 p-4 rounded-2xl bg-zinc-100 border border-zinc-200 text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-[#EF8354]/20 resize-none mb-4"
              autoFocus
            />
            <button
              onClick={handleAddCustomStyle}
              disabled={!customStyle.trim()}
              className="w-full py-3.5 rounded-xl font-bold text-sm text-white bg-[#EF8354] hover:bg-[#e27344] disabled:bg-zinc-300 disabled:cursor-not-allowed transition-all shadow-lg"
            >
              Add to Prompt
            </button>
          </div>
        </div>
      )}

      {/* Image Comparison Modal */}
      {comparisonImages && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-md" onClick={() => setComparisonImages(null)}>
          <div className="glass-panel rounded-3xl p-6 w-full max-w-4xl bg-white/90 backdrop-blur-xl shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-zinc-800 flex items-center gap-2">
                <ArrowRightLeft size={20} />
                Compare Images
              </h3>
              <button onClick={() => setComparisonImages(null)} className="p-2 hover:bg-zinc-100 rounded-full transition-all">
                <X size={20} />
              </button>
            </div>

            {/* Comparison Slider */}
            <div className="relative aspect-video rounded-2xl overflow-hidden bg-zinc-100">
              <ComparisonSlider leftImage={comparisonImages.left} rightImage={comparisonImages.right} />
            </div>

            <div className="flex items-center justify-center gap-4 mt-6">
              <button
                onClick={() => setComparisonImages(null)}
                className="px-6 py-3 rounded-xl font-semibold text-sm border border-zinc-200 hover:bg-zinc-50 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Style Selector Modal */}
      {showStyleSelector && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-4 bg-black/20 backdrop-blur-sm" onClick={() => setShowStyleSelector(false)}>
          <div className="glass-panel rounded-t-3xl md:rounded-3xl p-6 w-full max-w-2xl bg-white/90 backdrop-blur-xl shadow-2xl max-h-[80vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4 shrink-0">
              <h3 className="text-xl font-bold text-zinc-800">Select Art Style</h3>
              <button onClick={() => setShowStyleSelector(false)} className="p-2 hover:bg-zinc-100 rounded-full transition-all">
                <X size={20} />
              </button>
            </div>

            {/* Category Filter */}
            <div className="flex gap-2 overflow-x-auto pb-3 mb-2 shrink-0">
              <button
                onClick={() => setStyleCategory('All')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  styleCategory === 'All' ? 'bg-[#EF8354] text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                }`}
              >
                All Styles
              </button>
              {STYLE_CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setStyleCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    styleCategory === cat ? 'bg-[#EF8354] text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Styles Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 overflow-y-auto flex-1 custom-scrollbar">
              {ART_STYLES.filter(s => styleCategory === 'All' || s.category === styleCategory).map(style => (
                <button
                  key={style.id}
                  onClick={() => { setSelectedStyle(style); setShowStyleSelector(false); toast.success(`Style "${style.label}" selected`); }}
                  className={`p-4 rounded-2xl border-2 text-left transition-all hover:shadow-lg ${
                    selectedStyle.id === style.id
                      ? 'border-[#EF8354] bg-[#EF8354]/5'
                      : 'border-zinc-200 bg-white hover:border-[#EF8354]/50'
                  }`}
                >
                  <div className="text-lg mb-1">{style.label}</div>
                  <div className="text-[10px] text-zinc-400 truncate">{style.prompt || 'No style modifiers'}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// Comparison Slider Component
function ComparisonSlider({ leftImage, rightImage }: { leftImage: string; rightImage: string }) {
  const [position, setPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setPosition((x / rect.width) * 100);
  }, []);

  const handleMouseDown = () => setIsDragging(true);
  const handleMouseUp = () => setIsDragging(false);
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) handleMove(e.clientX);
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    handleMove(e.touches[0].clientX);
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full cursor-ew-resize select-none"
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseMove={handleMouseMove}
      onTouchMove={handleTouchMove}
      onMouseLeave={handleMouseUp}
    >
      {/* Right Image (Background) */}
      <img src={rightImage} alt="Right" className="absolute inset-0 w-full h-full object-cover" />
      
      {/* Left Image (Clipped) */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      >
        <img src={leftImage} alt="Left" className="absolute inset-0 w-full h-full object-cover" />
      </div>
      
      {/* Slider Handle */}
      <div
        className="absolute top-0 bottom-0 w-1 bg-white shadow-lg cursor-ew-resize"
        style={{ left: `${position}%` }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center">
          <ArrowRightLeft size={16} className="text-zinc-600" />
        </div>
      </div>
      
      {/* Labels */}
      <div className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-black/50 text-white text-xs font-semibold backdrop-blur-sm">
        Original
      </div>
      <div className="absolute top-4 right-4 px-3 py-1.5 rounded-full bg-black/50 text-white text-xs font-semibold backdrop-blur-sm">
        Variation
      </div>
    </div>
  );
}
