'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  LayoutGrid, Settings, MousePointer2, Hand, PenLine,
  ImagePlus, ChevronDown, ChevronsLeft, Sparkles, Plus,
  SlidersHorizontal, Menu, X, Loader2, Trash2, Check,
  Eye, EyeOff, Download, LogIn, Key, ExternalLink,
  History, Image, Wand2, ChevronRight, Video, BarChart3,
  RotateCcw, RotateCw, Images, ArrowRightLeft, Lock, Unlock
} from 'lucide-react';
import { toast } from 'sonner';
import { pollinationsAPI } from '@/lib/api';
import { storage, generateId, formatDate } from '@/lib/utils';
import { HistoryItem, GenerationParams } from '@/types';
import { ART_STYLES, STYLE_CATEGORIES, ArtStyle } from '@/lib/styles';
import { generateRandomPrompt, getRandomAppend, processPromptVariables } from '@/lib/prompts';
import { useTheme } from '@/lib/theme';
import { API_CONFIG, MODEL_FILTERS, DEFAULT_MODELS as DEFAULT_IMAGE_MODELS, API_HELPERS } from '@/lib/apiConfig';
import { revokeBlobUrl, cleanupCanvasImages } from '@/lib/canvasUtils';
import { gsap } from 'gsap';
import { animateEntrance, animateModalOpen, animateButtonClick, animateToastIn } from '@/lib/gsapAnimations';
import { imageDB } from '@/lib/imageStorage';

// No GSAP plugins needed - using native pointer events for better performance

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

// Custom aspect ratio state - stored in component
interface CustomAspectRatio {
  id: string;
  label: string;
  width: number;
  height: number;
  unit: string;
}

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

const APP_REDIRECT_URL = typeof window !== 'undefined' ? window.location.origin : 'https://image-gen-editor.vercel.app';
const BYOP_AUTH_URL = 'https://enter.pollinations.ai/authorize';

// =============================================
//  MAIN COMPONENT
// =============================================
export default function SpatialImageEditor() {
  // Theme
  const { accentColor } = useTheme();

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
    id: string; url: string; x: number; y: number; width: number; height: number; prompt: string; seed?: number;
  }>>([]);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Ref for tracking canvas images

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
  const [variationBaseImage, setVariationBaseImage] = useState<{ id: string; url: string; prompt: string } | null>(null);

  // Comparison state
  const [comparisonImages, setComparisonImages] = useState<{ left: string; right: string } | null>(null);

  // Parameters
  const [aspectRatio, setAspectRatio] = useState(ASPECT_RATIOS[5]);
  const [styleStrength, setStyleStrength] = useState(75);
  const [guidanceScale, setGuidanceScale] = useState(7.5);
  const [seed, setSeed] = useState(-1);
  const [steps, setSteps] = useState(30);
  const [activeModifiers, setActiveModifiers] = useState<string[]>([]);
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState('flux');
  const [penColor, setPenColor] = useState('var(--accent-color)');
  const [enhance, setEnhance] = useState(true);
  const [safe, setSafe] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [models, setModels] = useState<Array<{ value: string; label: string }>>([...DEFAULT_IMAGE_MODELS.image]);
  // Raw model data from API, keyed by model name — stores input_modalities etc.
  const [rawModelData, setRawModelData] = useState<Record<string, any>>({});
  const [selectedStyle, setSelectedStyle] = useState<ArtStyle>(ART_STYLES[0]);
  const [showStyleSelector, setShowStyleSelector] = useState(false);
  const [styleCategory, setStyleCategory] = useState<string>('All');
  const [showCustomStyleModal, setShowCustomStyleModal] = useState(false);
  const [customStyleName, setCustomStyleName] = useState('');
  const [customStylePrompt, setCustomStylePrompt] = useState('');
  const [customStyles, setCustomStyles] = useState<ArtStyle[]>([]);

  // Custom Aspect Ratio State
  const [showCustomAspectModal, setShowCustomAspectModal] = useState(false);
  const [customAspectWidth, setCustomAspectWidth] = useState('');
  const [customAspectHeight, setCustomAspectHeight] = useState('');
  const [customAspectUnit, setCustomAspectUnit] = useState('px');
  const [customAspectRatios, setCustomAspectRatios] = useState<Array<{ id: string; label: string; width: number; height: number }>>([]);

  // Load custom styles from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('pollinations_custom_styles');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setCustomStyles(parsed);
      } catch (e) {
        console.error('Failed to load custom styles:', e);
      }
    }

    // Load canvas images from localStorage
    const savedCanvas = localStorage.getItem('pollinations_canvas_images');
    if (savedCanvas) {
      try {
        const parsed = JSON.parse(savedCanvas);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCanvasImages(parsed);
          console.log('Loaded canvas images from localStorage:', parsed.length);
        }
      } catch (e) {
        console.error('Failed to load canvas images:', e);
      }
    }

    // Load seed locked state from localStorage
    const savedSeedLocked = localStorage.getItem('pollinations_seed_locked');
    if (savedSeedLocked) {
      try {
        setSeedLocked(JSON.parse(savedSeedLocked));
      } catch (e) {
        console.error('Failed to load seed locked state:', e);
      }
    }

    // Load custom aspect ratios from localStorage
    const savedAspectRatios = localStorage.getItem('pollinations_custom_aspect_ratios');
    if (savedAspectRatios) {
      try {
        const parsed = JSON.parse(savedAspectRatios);
        setCustomAspectRatios(parsed);
      } catch (e) {
        console.error('Failed to load custom aspect ratios:', e);
      }
    }
  }, []);

  // Save seed locked state to localStorage
  useEffect(() => {
    localStorage.setItem('pollinations_seed_locked', JSON.stringify(seedLocked));
  }, [seedLocked]);

  // Save custom style
  const handleSaveCustomStyle = () => {
    if (!customStyleName.trim() || !customStylePrompt.trim()) {
      toast.error('Please fill in both fields');
      return;
    }
    const newStyle: ArtStyle = {
      id: `custom-${Date.now()}`,
      label: customStyleName.trim(),
      prompt: customStylePrompt.trim(),
      negative: '',
      category: 'Custom',
    };
    const updated = [...customStyles, newStyle];
    setCustomStyles(updated);
    localStorage.setItem('pollinations_custom_styles', JSON.stringify(updated));
    setCustomStyleName('');
    setCustomStylePrompt('');
    setShowCustomStyleModal(false);
    toast.success('Custom style saved!');
  };

  // Delete custom style
  const handleDeleteCustomStyle = (styleId: string) => {
    const updated = customStyles.filter(s => s.id !== styleId);
    setCustomStyles(updated);
    localStorage.setItem('pollinations_custom_styles', JSON.stringify(updated));
    toast.success('Custom style deleted');
  };

  // Save custom aspect ratio
  const handleSaveCustomAspectRatio = () => {
    const width = parseFloat(customAspectWidth);
    const height = parseFloat(customAspectHeight);

    if (!width || !height || width <= 0 || height <= 0) {
      toast.error('Please enter valid width and height values');
      return;
    }

    // Convert to pixels based on unit
    let pixelWidth = width;
    let pixelHeight = height;

    // Conversion rates to pixels (assuming 96 DPI as base)
    const cmToInch = 2.54;
    const inchToPx = 96;

    switch (customAspectUnit) {
      case 'cm':
        pixelWidth = Math.round((width / cmToInch) * inchToPx);
        pixelHeight = Math.round((height / cmToInch) * inchToPx);
        break;
      case 'in':
        pixelWidth = Math.round(width * inchToPx);
        pixelHeight = Math.round(height * inchToPx);
        break;
      case 'mm':
        pixelWidth = Math.round((width / 10 / cmToInch) * inchToPx);
        pixelHeight = Math.round((height / 10 / cmToInch) * inchToPx);
        break;
      default:
        // Already in pixels
        pixelWidth = Math.round(width);
        pixelHeight = Math.round(height);
    }

    const newAspect: { id: string; label: string; width: number; height: number } = {
      id: `custom-${Date.now()}`,
      label: `${pixelWidth}×${pixelHeight}`,
      width: pixelWidth,
      height: pixelHeight,
    };

    const updated = [...customAspectRatios, newAspect];
    setCustomAspectRatios(updated);
    localStorage.setItem('pollinations_custom_aspect_ratios', JSON.stringify(updated));

    // Also set as current aspect ratio
    setAspectRatio({
      id: newAspect.id,
      label: newAspect.label,
      shapeClass: 'shape-custom',
      cssRatio: `${pixelWidth}/${pixelHeight}`,
      width: pixelWidth,
      height: pixelHeight,
    });

    setCustomAspectWidth('');
    setCustomAspectHeight('');
    setShowCustomAspectModal(false);
    toast.success(`Custom aspect ratio ${newAspect.label} saved!`);
  };

  // Delete custom aspect ratio
  const handleDeleteCustomAspectRatio = (ratioId: string) => {
    const updated = customAspectRatios.filter(r => r.id !== ratioId);
    setCustomAspectRatios(updated);
    localStorage.setItem('pollinations_custom_aspect_ratios', JSON.stringify(updated));
    toast.success('Custom aspect ratio deleted');
  };

  // Batch generation
  const [batchSize, setBatchSize] = useState(1);
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);

  // Advanced parameters
  const [negativePrompt, setNegativePrompt] = useState('');
  const [nologo, setNologo] = useState(false);
  const [transparent, setTransparent] = useState(false);
  const [seedLocked, setSeedLocked] = useState(false);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // GSAP page entrance animation
  useEffect(() => {
    // Animate page elements on mount
    const ctx = gsap.context(() => {
      // Main container entrance
      gsap.fromTo('.page-container',
        { opacity: 0 },
        { opacity: 1, duration: 0.4, ease: 'power2.out' }
      );

      // Staggered menu items
      gsap.fromTo('.menu-item',
        { opacity: 0, y: -10 },
        { opacity: 1, y: 0, duration: 0.3, stagger: 0.05, delay: 0.2, ease: 'power2.out' }
      );

      // Sidebar panel entrance
      gsap.fromTo('.sidebar-panel',
        { opacity: 0, x: -30 },
        { opacity: 1, x: 0, duration: 0.5, delay: 0.3, ease: 'power3.out' }
      );

      // Bottom panel entrance
      gsap.fromTo('.bottom-panel',
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.5, delay: 0.4, ease: 'power3.out' }
      );

      // Tool buttons entrance
      gsap.fromTo('.tool-button',
        { opacity: 0, scale: 0.8 },
        { opacity: 1, scale: 1, duration: 0.3, stagger: 0.08, delay: 0.5, ease: 'back.out(1.7)' }
      );

      // Parameter section animations
      gsap.fromTo('.param-section',
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.4, stagger: 0.1, delay: 0.6, ease: 'power2.out' }
      );
    });

    return () => ctx.revert();
  }, []);

  // Animate sidebar open/close
  useEffect(() => {
    if (isSidebarOpen) {
      gsap.fromTo('.sidebar-panel',
        { x: -100, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.35, ease: 'power3.out' }
      );
    }
  }, [isSidebarOpen]);

  // Animate generate button hover
  const generateBtnRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const btn = generateBtnRef.current;
    if (!btn) return;

    const handleMouseEnter = () => {
      gsap.to(btn, {
        scale: 1.02,
        boxShadow: '0 10px 40px -10px var(--accent-color)',
        duration: 0.3,
        ease: 'power2.out'
      });
    };

    const handleMouseLeave = () => {
      gsap.to(btn, {
        scale: 1,
        boxShadow: '0 4px 20px -5px var(--accent-color)',
        duration: 0.3,
        ease: 'power2.out'
      });
    };

    btn.addEventListener('mouseenter', handleMouseEnter);
    btn.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      btn.removeEventListener('mouseenter', handleMouseEnter);
      btn.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  // Button click animation handler
  const handleButtonClick = useCallback((e: React.MouseEvent, callback: () => void) => {
    const target = e.currentTarget as HTMLElement;
    gsap.to(target, {
      scale: 0.94,
      duration: 0.1,
      ease: 'power2.out',
      onComplete: () => {
        gsap.to(target, {
          scale: 1,
          duration: 0.15,
          ease: 'elastic.out(1, 0.5)'
        });
        callback();
      }
    });
  }, []);

  // =============================================
  useEffect(() => {
    // Fetch from centralized API config
    fetch(API_HELPERS.getModelsUrl('image'))
      .then(res => res.json())
      .then((data: any[]) => {
        console.log('📦 All models from API:', data.length);
        if (data[0]) {
          console.log('Sample model structure:', JSON.stringify(Object.keys(data[0])));
          console.log('Sample model:', data[0].name, 'output_modalities:', data[0].output_modalities, 'input_modalities:', data[0].input_modalities);
        }

        // Filter for image models only using centralized MODEL_FILTERS
        const imageModels = data.filter(MODEL_FILTERS.imageModels);
        console.log('✅ Filtered image models:', imageModels.length);

        // Log which models support image editing (accept image input)
        const editModels = imageModels.filter(MODEL_FILTERS.imageEditingModels);
        const genOnlyModels = imageModels.filter(m => !MODEL_FILTERS.imageEditingModels(m));
        console.log('🖊️ Edit-capable models:', editModels.map((m: any) => m.name));
        console.log('🖼️ Generation-only models:', genOnlyModels.map((m: any) => m.name));

        if (imageModels.length > 0) {
          // Store raw model data keyed by name for later lookup
          const rawData: Record<string, any> = {};
          imageModels.forEach((m: any) => {
            rawData[m.name] = m;
          });
          setRawModelData(rawData);

          // API uses `name` as the identifier
          setModels(imageModels.map((m: any) => ({
            value: m.name,
            label: m.description || m.name,
          })));
        } else {
          console.warn('No image models found from API, using defaults');
        }
      }).catch(err => console.error('Failed to fetch models:', err));
  }, []);

  // Guarantee that when reference images are present, an image-editing model is selected
  useEffect(() => {
    if (referenceImages.length > 0 && Object.keys(rawModelData).length > 0) {
      const modelData = rawModelData[selectedModel];
      const supportsImageInput = modelData?.input_modalities?.includes('image');

      if (!supportsImageInput) {
        // Find the first model that supports image editing
        const firstEditModel = models.find(m => rawModelData[m.value]?.input_modalities?.includes('image'));
        if (firstEditModel) {
          setSelectedModel(firstEditModel.value);
          toast.info(`Switched to ${firstEditModel.label} for image editing.`);
        }
      }
    }
  }, [referenceImages, selectedModel, rawModelData, models]);

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

  // Pan handler for canvas (hand tool or middle click)
  const handleCanvasPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isPanning) return;
    e.preventDefault();
    setPan({
      x: e.clientX - panStart.x,
      y: e.clientY - panStart.y,
    });
  }, [isPanning, panStart]);

  const handleCanvasPointerUp = useCallback((e: React.PointerEvent) => {
    if (isPanning) {
      setIsPanning(false);
    }
  }, [isPanning]);
  const handleCanvasPointerDown = useCallback((e: React.PointerEvent) => {
    // Only pan with hand tool or middle click
    if (activeTool === 'hand' || e.button === 1) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }
    // Deselect when clicking empty canvas with pointer tool
    if (activeTool === 'pointer' && e.target === e.currentTarget) {
      setSelectedImageId(null);
    }
  }, [activeTool, pan]);

  // Custom pointer-based drag handler for buttery smooth dragging with GPU acceleration
  const handleImagePointerDown = useCallback((e: React.PointerEvent, imageId: string) => {
    if (activeTool !== 'pointer') return;
    e.preventDefault();
    e.stopPropagation();

    const img = canvasImages.find(i => i.id === imageId);
    if (!img) return;

    setSelectedImageId(imageId);

    const startX = e.clientX;
    const startY = e.clientY;
    const initialImgX = img.x;
    const initialImgY = img.y;

    // Track if we're dragging
    let isDragging = false;
    const DRAG_THRESHOLD = 3; // pixels to consider as drag vs click

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      // Check if we've moved enough to consider it a drag
      if (!isDragging && (Math.abs(deltaX) > DRAG_THRESHOLD || Math.abs(deltaY) > DRAG_THRESHOLD)) {
        isDragging = true;
      }

      if (isDragging) {
        // Calculate new position accounting for zoom
        const newX = initialImgX + deltaX / zoom;
        const newY = initialImgY + deltaY / zoom;

        // Update position immediately for smooth 60fps rendering
        setCanvasImages(prev => prev.map(i =>
          i.id === imageId ? { ...i, x: newX, y: newY } : i
        ));
      }
    };

    const handlePointerUp = (upEvent: PointerEvent) => {
      // Clean up event listeners
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);

      if (isDragging) {
        // Save final position to localStorage
        const currentImg = canvasImages.find(i => i.id === imageId);
        if (currentImg) {
          const updatedImages = canvasImages.map(i =>
            i.id === imageId ? { ...i, x: currentImg.x, y: currentImg.y } : i
          );
          localStorage.setItem('pollinations_canvas_images', JSON.stringify(updatedImages));
        }
      }
      // If not dragging (just a click), selection is already handled
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  }, [activeTool, zoom, canvasImages]);

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
        // IMAGE EDIT MODE - Uses POST /v1/images/edits with multipart
        console.log('🎨 EDIT MODE');
        console.log('📷 Reference images:', referenceImages);
        console.log('📝 Prompt:', fullPrompt);
        console.log('🔧 Using selected model:', selectedModel);

        // Ensure the selected model actually supports image editing
        const modelData = rawModelData[selectedModel];
        const supportsImageInput = modelData?.input_modalities?.includes('image');

        if (!supportsImageInput) {
          toast.error(`The selected model "${selectedModel}" does not support image editing. Please select a different model.`);
          setIsGenerating(false);
          return;
        }

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

        console.log('🔗 Edit URL:', imageUrl);
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
        seed: actualSeed,
      };
      const newImages = [...canvasImages, newImg];
      setCanvasImages(newImages);
      setSelectedImageId(newImg.id);

      // Only update seed display if not locked - keep the value for reference but reset to -1 for next generation
      if (!seedLocked) {
        setSeed(-1);
      }

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

      // Save canvas images to localStorage
      const prevImages = [...canvasImages, newImg];
      localStorage.setItem('pollinations_canvas_images', JSON.stringify(prevImages));

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

  const processFiles = async (files: File[]) => {
    const availableSlots = 4 - referenceImages.length;
    const filesToUpload = files.slice(0, availableSlots);

    if (filesToUpload.length === 0) {
      if (files.length > 0) toast.error('Maximum 4 reference images allowed');
      return;
    }

    // Upload each file and get public URL
    for (const file of filesToUpload) {
      if (!file.type.startsWith('image/')) {
        toast.error('Only images are allowed');
        continue;
      }

      const toastId = `upload-${file.name}`;

      try {
        toast.loading('Uploading image to Pollinations CDN...', { id: toastId });

        const imageUrl = await pollinationsAPI.uploadImage(file);

        if (imageUrl) {
          setReferenceImages(prev => {
            if (prev.length >= 4) return prev;
            return [...prev, imageUrl];
          });
          toast.success('✓ Image ready for editing!', { id: toastId, duration: 3000 });
          console.log('✅ Reference image URL:', imageUrl);
        }
      } catch (error) {
        console.error('Upload error:', error);
        toast.error(
          <div>
            <p className="font-semibold">Upload failed</p>
            <p className="text-xs mt-1">
              Please add your API key in Settings first, or use a public image URL.
            </p>
          </div>,
          { id: toastId, duration: 5000 }
        );
      }
    }
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

  // Generate variation of an image
  const generateVariations = async (image: { id: string; url: string; prompt: string; seed?: number }) => {
    if (!hasApiKey) { toast.error('Add API key first'); return; }
    setGeneratingVariations(image.id);
    setVariationBaseImage(image);

    try {
      // Use the saved seed from the image if available, otherwise generate random
      const variationSeed = image.seed && image.seed !== -1 ? image.seed : Math.floor(Math.random() * 999999999);
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

      // Add variation to canvas slightly offset
      const newVariation = {
        id: generateId(),
        url: imageUrl,
        prompt: image.prompt,
        width: params.width,
        height: params.height,
        x: (canvasImg?.x || 0) + 50,
        y: (canvasImg?.y || 0) + 50,
      };

      setCanvasImages(prev => [...prev, newVariation]);
      setSelectedImageId(newVariation.id);

      toast.success('Variation generated!');
    } catch (error) {
      console.error('Variation error:', error);
      toast.error('Failed to generate variation');
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
    // Get the image being deleted (to find its URL for history)
    const imgToDelete = canvasImages.find(img => img.id === id);

    setCanvasImages(prev => {
      const newImages = prev.filter(img => img.id !== id);
      // Save to localStorage - removes from both canvas AND localStorage
      localStorage.setItem('pollinations_canvas_images', JSON.stringify(newImages));

      // Also remove from history if we found the image
      if (imgToDelete) {
        const history = storage.getHistory();
        const newHistory = history.filter(item => item.imageUrl !== imgToDelete.url);
        storage.setHistory(newHistory);
      }

      return newImages;
    });
    if (selectedImageId === id) setSelectedImageId(null);
    toast.success('Removed from canvas');
  };

  const resetView = () => { setPan({ x: 0, y: 0 }); setZoom(1); };

  // Clear canvas (remove all images from canvas AND localStorage)
  const clearCanvas = () => {
    setCanvasImages([]);
    setSelectedImageId(null);
    localStorage.removeItem('pollinations_canvas_images');
    toast.success('Canvas cleared. Images are saved in history.');
  };

  // =============================================
  //  DRAWING LOGIC (with undo/redo and image support)
  // =============================================
  useEffect(() => {
    if (activeTool !== 'pen' || !drawingCanvasRef.current) return;
    const canvas = drawingCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const redrawAllStrokes = () => {
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

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      // Redraw all strokes after resize
      redrawAllStrokes();
    };
    resize();

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
    <div className="page-container w-full h-[100dvh] relative overflow-hidden">

      {/* =========================================
          INFINITE CANVAS (full viewport)
      ========================================= */}
      <div
        ref={canvasContainerRef}
        className={`infinite-canvas ${activeTool === 'hand' ? 'cursor-grab' : activeTool === 'pen' ? 'cursor-crosshair' : 'cursor-default'} ${isPanning ? '!cursor-grabbing' : ''}`}
        onPointerDown={handleCanvasPointerDown}
        onPointerMove={handleCanvasPointerMove}
        onPointerUp={handleCanvasPointerUp}
        onPointerLeave={handleCanvasPointerUp}
        onPointerCancel={handleCanvasPointerUp}
      >
        <div
          className="canvas-transform"
          style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
        >
          {/* Canvas Images */}
          {canvasImages.map((img, index) => (
            <div
              key={img.id}
              className={`absolute group ${selectedImageId === img.id
                ? 'ring-4 ring-offset-2 ring-offset-white/30 shadow-2xl ring-[var(--accent-color)]'
                : 'hover:ring-2 hover:shadow-xl'
                } ${activeTool === 'pointer' ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
              style={{
                left: img.x,
                top: img.y,
                width: img.width,
                height: img.height,
                zIndex: selectedImageId === img.id ? 100 : index,
                boxShadow: selectedImageId === img.id ? `0 20px 50px -12px ${accentColor}66` : undefined,
                // GPU acceleration for smooth movement
                transform: 'translateZ(0)',
                willChange: 'left, top',
                backfaceVisibility: 'hidden',
              }}
              onPointerDown={(e) => handleImagePointerDown(e, img.id)}
            >
              <img
                src={img.url}
                alt={img.prompt}
                className="w-full h-full object-cover rounded-2xl shadow-lg pointer-events-none"
                draggable={false}
              />

              {/* Generation overlay for variations */}
              {generatingVariations === img.id && (
                <div className="absolute inset-0 bg-white/40 rounded-2xl flex items-center justify-center backdrop-blur-sm z-50">
                  <div className="bg-white/80 p-4 rounded-full flex flex-col items-center justify-center gap-2 shadow-xl border border-zinc-100">
                    <Loader2 size={32} className="animate-spin" style={{ color: accentColor }} />
                    <span className="text-[10px] font-bold text-zinc-700 uppercase tracking-wider">Generating...</span>
                  </div>
                </div>
              )}

              {/* Hover actions - responsive size based on image */}
              <div className={`absolute -top-3 right-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 ${img.width < 400 ? 'scale-75' : img.width < 800 ? 'scale-90' : 'scale-100'
                }`}>
                {/* Variations button */}
                <button
                  onClick={(e) => { e.stopPropagation(); generateVariations({ id: img.id, url: img.url, prompt: img.prompt }); }}
                  disabled={generatingVariations === img.id}
                  className="px-3 py-1.5 rounded-full glass-panel text-xs font-semibold text-zinc-700 hover:bg-white/80 transition-all flex items-center gap-1.5 shadow-lg backdrop-blur-md disabled:opacity-50"
                >
                  {generatingVariations === img.id ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Images size={12} />
                  )}
                  <span className="hidden sm:inline">{generatingVariations === img.id ? 'Loading' : 'Variation'}</span>
                </button>

                <button
                  onClick={(e) => { e.stopPropagation(); downloadImage(img.url, img.id); }}
                  className="px-3 py-1.5 rounded-full glass-panel text-xs font-semibold text-zinc-700 hover:bg-white/80 transition-all flex items-center gap-1.5 shadow-lg backdrop-blur-md"
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
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-white text-[10px] font-bold uppercase tracking-wider shadow-lg" style={{ backgroundColor: accentColor }}>
                  Selected
                </div>
              )}
            </div>
          ))}

          {/* Drawing overlay - sits on entire canvas */}
          {activeTool === 'pen' && (
            <canvas
              ref={drawingCanvasRef}
              style={{
                position: 'absolute',
                left: -5000,
                top: -5000,
                width: 10000,
                height: 10000,
                zIndex: 100,
                pointerEvents: 'auto',
                touchAction: 'none',
              }}
            />
          )}
        </div>

        {/* Empty State (centered in viewport) */}
        {canvasImages.length === 0 && !isGenerating && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center select-none">
              <div className="w-20 h-20 rounded-3xl mb-5 flex items-center justify-center mx-auto" style={{ backgroundColor: `${accentColor}1A` }}>
                <Wand2 size={36} style={{ color: accentColor }} />
              </div>
              <h2 className="text-xl font-bold text-zinc-700 mb-2">Start Creating</h2>
              <p className="text-sm text-zinc-400 max-w-[300px] mx-auto">Enter a prompt and click Generate.<br />Scroll to zoom · Drag with Hand tool to pan</p>
            </div>
          </div>
        )}

        {/* Generating indicator (centered in viewport) */}
        {isGenerating && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div className="glass-panel rounded-3xl px-8 py-6 flex flex-col items-center gap-3 animate-fade-in">
              <Loader2 className="animate-spin" size={36} style={{ color: accentColor }} />
              <span className="font-semibold text-zinc-700 text-sm">Synthesizing {aspectRatio.label} Image...</span>
            </div>
          </div>
        )}
      </div>


      {/* =========================================
          TOP-LEFT: MENU PILL
      ========================================= */}
      <div className="fixed top-4 left-4 md:top-6 md:left-6 z-[70] flex items-center gap-2">
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
            onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors font-medium text-sm ${menuOpen ? 'bg-[var(--accent-color)]/10 text-[var(--accent-color)]' : 'text-zinc-700 hover:bg-black/5'}`}
          >
            <LayoutGrid size={16} />
            <span className="hidden sm:inline">Create</span>
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
            <div className="absolute top-full left-0 mt-2 w-56 glass-panel rounded-2xl p-2 shadow-xl animate-slide-down z-[80]">
              <a href="/" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[var(--accent-color)] bg-[var(--accent-color)]/5 transition-colors">
                <Wand2 size={16} /> Image Generation
              </a>
              <a href="/history" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-700 hover:bg-black/5 transition-colors">
                <History size={16} /> My Generations
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
                <button onClick={resetView} className="text-xs font-semibold text-[var(--accent-color)] hover:underline">Reset View</button>
              </div>
              <div className="px-3 py-2 flex items-center justify-between">
                <button onClick={clearCanvas} className="text-xs font-semibold text-red-500 hover:underline flex items-center gap-1">
                  <Trash2 size={12} /> Clear Canvas
                </button>
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
          className="fixed top-1/2 left-[88vw] md:left-[348px] md:bottom-36 -translate-y-1/2 z-40 p-2.5 glass-panel rounded-full shadow-lg hover:scale-110 transition-all backdrop-blur-xl bg-white/80 group"
        >
          <ChevronRight size={18} className="text-zinc-600 group-hover:text-[var(--accent-color)] transition-colors" />
        </button>
      )}


      {/* =========================================
          TOP-RIGHT: TOOL BUTTONS
      ========================================= */}
      <div className="fixed top-4 right-4 md:top-6 md:right-6 z-50">
        <div className="glass-pill rounded-full flex flex-row md:flex-col items-center p-1.5 md:p-2 gap-1 md:gap-2">
          <button
            onClick={() => setActiveTool('pointer')}
            className={`p-2 rounded-full transition-colors ${activeTool === 'pointer' ? 'bg-[var(--accent-color)]/10 text-[var(--accent-color)]' : 'text-zinc-500 hover:text-black hover:bg-black/5'}`}
          >
            <MousePointer2 size={18} />
          </button>
          <button
            onClick={() => setActiveTool('hand')}
            className={`p-2 rounded-full transition-colors ${activeTool === 'hand' ? 'bg-[var(--accent-color)]/10 text-[var(--accent-color)]' : 'text-zinc-500 hover:text-black hover:bg-black/5'}`}
          >
            <Hand size={18} />
          </button>
          <button
            onClick={() => setActiveTool('pen')}
            className={`p-2 rounded-full transition-colors ${activeTool === 'pen' ? 'bg-[var(--accent-color)]/10 text-[var(--accent-color)]' : 'text-zinc-500 hover:text-black hover:bg-black/5'}`}
          >
            <PenLine size={18} />
          </button>

          {activeTool === 'pen' && (
            <>
              <div className="w-px h-4 bg-zinc-200 mx-1"></div>
              <div className="flex items-center gap-1.5 px-2">
                {['var(--accent-color)', '#2D3142', '#4F5D75', '#BFC0C0', '#FFFFFF', '#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'].slice(0, 8).map(c => (
                  <button
                    key={c}
                    onClick={() => setPenColor(c)}
                    className={`w-4 h-4 rounded-full border border-zinc-200 transition-transform ${penColor === c ? 'scale-125 ring-2 ring-[var(--accent-color)]/20' : 'hover:scale-110'}`}
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
        <div
          className="fixed inset-0 bg-black/10 backdrop-blur-sm z-40"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside className={`sidebar-panel fixed top-16 bottom-[160px] md:top-20 md:bottom-36 left-4 md:left-6 w-[85vw] md:w-[340px] max-w-[340px] glass-panel rounded-[28px] p-4 md:p-6 z-50 flex flex-col gap-4 custom-scrollbar overflow-y-auto transition-all duration-300 ease-out backdrop-blur-xl bg-white/70 border border-white/20
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
                <span className="px-2 py-0.5 rounded-full bg-[var(--accent-color)]/10 text-[var(--accent-color)] text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
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
            <div className="p-3 rounded-xl bg-[var(--accent-color)]/5 border border-[var(--accent-color)]/20">
              <p className="text-[10px] text-zinc-600 leading-relaxed">
                <strong className="text-[var(--accent-color)]">Image Edit Mode:</strong> The AI will edit your reference image based on your prompt. Uses /v1/images/edits endpoint.
              </p>
            </div>
          )}

          {referenceImages.length > 0 && (
            <div className="grid grid-cols-2 gap-2 mb-3">
              {referenceImages.map((imgUrl, i) => (
                <div key={i} className="relative aspect-square rounded-xl overflow-hidden group">
                  <img src={imgUrl} alt={`Ref ${i + 1}`} className="w-full h-full object-cover" />
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
              className={`w-full ${referenceImages.length > 0 ? 'aspect-[4/1]' : 'aspect-[4/2.5]'} rounded-2xl border-2 border-dashed border-zinc-200 bg-white/40 flex flex-col items-center justify-center cursor-pointer hover:border-[var(--accent-color)]/50 hover:bg-white/60 transition-all group relative overflow-hidden`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" multiple className="hidden" />
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--accent-color)]/10 flex items-center justify-center text-[var(--accent-color)] group-hover:scale-110 transition-transform">
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
            className={`w-full text-xs font-semibold py-2.5 rounded-xl border border-zinc-200/50 bg-white/40 hover:bg-[var(--accent-color)]/5 hover:text-[var(--accent-color)] transition-all
               ${referenceImages.length >= 4 ? 'hidden' : 'block'}`}
          >
            Or paste image URL
          </button>
        </section>

        {/* Aspect Ratio */}
        <section className="space-y-3 shrink-0">
          <label className="text-sm font-semibold text-zinc-700 flex justify-between">
            Aspect Ratio <span className="text-[var(--accent-color)] font-bold">{aspectRatio.label}</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {ASPECT_RATIOS.map(ratio => (
              <button
                key={ratio.id}
                onClick={() => setAspectRatio(ratio)}
                className={`flex flex-col items-center justify-center p-3 rounded-xl text-xs font-semibold transition-all
                  ${aspectRatio.id === ratio.id ? 'bg-[var(--accent-color)] text-white shadow-lg' : 'bg-zinc-100/80 text-zinc-600 hover:bg-zinc-200/80 border border-zinc-200/50'}`}
              >
                <div className={`${ratio.shapeClass} mb-2 ${aspectRatio.id === ratio.id ? 'bg-white/30' : 'bg-zinc-400'}`}></div>
                <span>{ratio.label}</span>
              </button>
            ))}
          </div>

          {/* Custom Aspect Ratios */}
          {customAspectRatios.length > 0 && (
            <div className="mt-3">
              <span className="text-xs font-medium text-zinc-500 mb-2 block">Custom</span>
              <div className="grid grid-cols-2 gap-2">
                {customAspectRatios.map(ratio => (
                  <div key={ratio.id} className="relative group">
                    <button
                      onClick={() => setAspectRatio({
                        id: ratio.id,
                        label: ratio.label,
                        shapeClass: 'shape-custom',
                        cssRatio: `${ratio.width}/${ratio.height}`,
                        width: ratio.width,
                        height: ratio.height,
                      })}
                      className={`w-full flex flex-col items-center justify-center p-2.5 rounded-xl text-xs font-semibold transition-all
                        ${aspectRatio.id === ratio.id ? 'bg-[var(--accent-color)] text-white shadow-lg' : 'bg-zinc-100/80 text-zinc-600 hover:bg-zinc-200/80 border border-zinc-200/50'}`}
                    >
                      <span>{ratio.label}</span>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteCustomAspectRatio(ratio.id); }}
                      className="absolute -top-1 -right-1 p-1 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add Custom Aspect Ratio Button */}
          <button
            onClick={() => setShowCustomAspectModal(true)}
            className="w-full mt-3 py-2.5 rounded-xl border-2 border-dashed border-zinc-300 text-xs font-semibold text-zinc-500 hover:border-[var(--accent-color)]/50 hover:text-[var(--accent-color)] hover:bg-[var(--accent-color)]/5 transition-all flex items-center justify-center gap-2"
          >
            <Plus size={14} />
            Add Custom Size
          </button>
        </section>

        {/* Model */}
        <section className="space-y-3 shrink-0">
          <label className="text-sm font-semibold text-zinc-700">
            Model
            {referenceImages.length > 0 && (
              <span className="ml-2 text-xs font-normal text-amber-600">✏️ Filtered for image editing</span>
            )}
          </label>
          <div className="relative">
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full appearance-none bg-zinc-100/80 border border-zinc-200/50 rounded-xl py-3 px-4 pr-10 text-sm font-semibold text-zinc-700 focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]/20 cursor-pointer"
            >
              {models
                .filter(m => referenceImages.length === 0 || rawModelData[m.value]?.input_modalities?.includes('image'))
                .map(m => (
                  <option key={m.value} value={m.value}>
                    {referenceImages.length > 0 ? '✏️ ' : ''}{rawModelData[m.value]?.paid_only ? '🔒 ' : ''}{m.label}
                  </option>
                ))}
            </select>
            <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
          </div>
          {/* Show pro badge if current model is paid_only */}
          {rawModelData[selectedModel]?.paid_only && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200">
              <span className="text-[10px]">🔒</span>
              <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Premium Model</span>
            </div>
          )}
        </section>

        {/* Art Style */}
        <section className="space-y-3 shrink-0">
          <label className="text-sm font-semibold text-zinc-700">Art Style</label>
          <button
            onClick={() => setShowStyleSelector(true)}
            className="w-full p-3 rounded-xl bg-zinc-100/80 border border-zinc-200 text-left text-sm font-semibold text-zinc-700 hover:border-[var(--accent-color)]/50 transition-all flex items-center justify-between"
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
              <span className="text-xs font-bold text-[var(--accent-color)] bg-[var(--accent-color)]/10 border border-[var(--accent-color)]/20 px-2 py-0.5 rounded-md">{styleStrength}%</span>
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
                  className="w-full bg-zinc-100/80 border border-zinc-200/50 rounded-lg px-3 py-2 text-xs text-zinc-700 focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]/20 resize-none"
                  placeholder="What to avoid in the image..."
                  rows={2}
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-zinc-600 shrink-0">Seed</label>
                  <button
                    onClick={() => setSeedLocked(!seedLocked)}
                    className={`p-1 rounded-md transition-colors ${seedLocked ? 'text-[var(--accent-color)] bg-[var(--accent-color)]/10' : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100'}`}
                    title={seedLocked ? 'Unlock seed (will reset to random after generation)' : 'Lock seed (keep same seed for variations)'}
                  >
                    {seedLocked ? <Lock size={14} /> : <Unlock size={14} />}
                  </button>
                </div>
                <div className="flex flex-1 items-center bg-zinc-100/80 rounded-lg px-3 py-1.5 border border-zinc-200/50">
                  <input
                    type="number"
                    value={seed}
                    onChange={e => setSeed(Number(e.target.value))}
                    className="w-full bg-transparent text-xs font-mono text-zinc-700 focus:outline-none"
                    placeholder="-1 = random"
                  />
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
      <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none pb-2 md:pb-6">
        <div className="glass-panel rounded-t-[32px] rounded-b-none p-4 md:p-6 w-full max-w-4xl mx-4 md:mx-auto pointer-events-auto shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.2)] backdrop-blur-xl bg-white/70 border-t border-x border-white/20">

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
              ref={generateBtnRef}
              onClick={(e) => { e.stopPropagation(); handleGenerate(); }}
              disabled={isGenerating}
              className={`text-white px-6 py-4 rounded-2xl font-bold text-sm md:text-base flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 shrink-0 h-[60px] md:h-16
                ${isGenerating ? 'bg-zinc-400 shadow-none cursor-not-allowed' : 'bg-[var(--accent-color)] hover:bg-[var(--accent-color-dark)] shadow-[var(--accent-color)]/25 hover:shadow-xl hover:shadow-[var(--accent-color)]/30'}`}
            >
              {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
              {isGenerating ? 'Synthesizing...' : 'Generate'}
            </button>
          </div>
        </div>
      </div>

      {/* Custom Style Modal */}
      {
        showStyleModal && (
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
                className="w-full h-32 p-4 rounded-2xl bg-zinc-100 border border-zinc-200 text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]/20 resize-none mb-4"
                autoFocus
              />
              <button
                onClick={handleAddCustomStyle}
                disabled={!customStyle.trim()}
                className="w-full py-3.5 rounded-xl font-bold text-sm text-white bg-[var(--accent-color)] hover:bg-[var(--accent-color-dark)] disabled:bg-zinc-300 disabled:cursor-not-allowed transition-all shadow-lg"
              >
                Add to Prompt
              </button>
            </div>
          </div>
        )
      }

      {/* Image Comparison Modal */}
      {
        comparisonImages && (
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
        )
      }

      {/* Style Selector Modal */}
      {
        showStyleSelector && (
          <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-4 bg-black/20 backdrop-blur-sm" onClick={() => setShowStyleSelector(false)}>
            <div className="glass-panel rounded-t-3xl md:rounded-3xl p-6 w-full max-w-2xl bg-white/90 backdrop-blur-xl shadow-2xl max-h-[80vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4 shrink-0">
                <h3 className="text-xl font-bold text-zinc-800">Select Art Style</h3>
                <button onClick={() => setShowStyleSelector(false)} className="p-2 hover:bg-zinc-100 rounded-full transition-all">
                  <X size={20} />
                </button>
              </div>

              {/* Add Custom Style Button */}
              <button
                onClick={() => { setShowCustomStyleModal(true); setShowStyleSelector(false); }}
                className="mb-4 p-3 rounded-xl border-2 border-dashed border-zinc-300 hover:border-[var(--accent-color)]/50 hover:bg-[var(--accent-color)]/5 transition-all flex items-center justify-center gap-2 text-sm font-semibold text-zinc-500 hover:text-[var(--accent-color)]"
              >
                <Plus size={16} />
                Create Custom Style
              </button>

              {/* Category Filter */}
              <div className="flex gap-2 overflow-x-auto pb-3 mb-2 shrink-0">
                <button
                  onClick={() => setStyleCategory('All')}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${styleCategory === 'All' ? 'bg-[var(--accent-color)] text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                    }`}
                >
                  All
                </button>
                <button
                  onClick={() => setStyleCategory('Custom')}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${styleCategory === 'Custom' ? 'bg-[var(--accent-color)] text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                    }`}
                >
                  Custom
                </button>
                {STYLE_CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setStyleCategory(cat)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${styleCategory === cat ? 'bg-[var(--accent-color)] text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                      }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Styles Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 overflow-y-auto flex-1 custom-scrollbar">
                {/* Custom Styles */}
                {styleCategory === 'Custom' && customStyles.map(style => (
                  <div
                    key={style.id}
                    className="relative p-4 rounded-2xl border-2 border-zinc-200 bg-white text-left transition-all hover:shadow-lg group"
                  >
                    <button
                      onClick={() => { setSelectedStyle(style); setShowStyleSelector(false); toast.success(`Style "${style.label}" selected`); }}
                      className="absolute inset-0 w-full h-full"
                    />
                    <div className="text-sm font-bold text-zinc-800 mb-1">{style.label}</div>
                    <div className="text-[10px] text-zinc-400 truncate">{style.prompt}</div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteCustomStyle(style.id); }}
                      className="absolute top-2 right-2 p-1 rounded-full bg-red-100 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-200"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}

                {/* Built-in Styles */}
                {styleCategory !== 'Custom' && ART_STYLES.filter(s => styleCategory === 'All' || s.category === styleCategory).map(style => (
                  <button
                    key={style.id}
                    onClick={() => { setSelectedStyle(style); setShowStyleSelector(false); toast.success(`Style "${style.label}" selected`); }}
                    className={`p-4 rounded-2xl border-2 text-left transition-all hover:shadow-lg ${selectedStyle.id === style.id
                      ? 'border-[var(--accent-color)] bg-[var(--accent-color)]/5'
                      : 'border-zinc-200 bg-white hover:border-[var(--accent-color)]/50'
                      }`}
                  >
                    <div className="text-lg mb-1">{style.label}</div>
                    <div className="text-[10px] text-zinc-400 truncate">{style.prompt || 'No style modifiers'}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )
      }

      {/* Custom Style Creation Modal */}
      {
        showCustomStyleModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm" onClick={() => setShowCustomStyleModal(false)}>
            <div className="glass-panel rounded-3xl p-6 w-full max-w-md bg-white/90 backdrop-blur-xl shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-zinc-800">Create Custom Style</h3>
                <button onClick={() => setShowCustomStyleModal(false)} className="p-2 hover:bg-zinc-100 rounded-full transition-all">
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-zinc-600 mb-1 block">Style Name</label>
                  <input
                    type="text"
                    value={customStyleName}
                    onChange={e => setCustomStyleName(e.target.value)}
                    placeholder="e.g., My Cyberpunk Style"
                    className="w-full p-3 rounded-xl bg-zinc-100 border border-zinc-200 text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]/20"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-600 mb-1 block">Style Prompt</label>
                  <textarea
                    value={customStylePrompt}
                    onChange={e => setCustomStylePrompt(e.target.value)}
                    placeholder="e.g., cyberpunk, neon lights, futuristic city, rain-soaked streets..."
                    className="w-full h-32 p-3 rounded-xl bg-zinc-100 border border-zinc-200 text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]/20 resize-none"
                  />
                </div>
                <button
                  onClick={handleSaveCustomStyle}
                  className="w-full py-3.5 rounded-xl font-bold text-sm text-white bg-[var(--accent-color)] hover:bg-[var(--accent-color-dark)] transition-all shadow-lg"
                >
                  Save Custom Style
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Custom Aspect Ratio Modal */}
      {
        showCustomAspectModal && (
          <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-4 bg-black/20 backdrop-blur-sm" onClick={() => setShowCustomAspectModal(false)}>
            <div className="glass-panel rounded-t-3xl md:rounded-3xl p-6 w-full max-w-sm bg-white/90 backdrop-blur-xl shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-zinc-800">Custom Image Size</h3>
                <button onClick={() => setShowCustomAspectModal(false)} className="p-2 hover:bg-zinc-100 rounded-full transition-all">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-zinc-600 mb-1 block">Width</label>
                    <input
                      type="number"
                      value={customAspectWidth}
                      onChange={e => setCustomAspectWidth(e.target.value)}
                      placeholder="1920"
                      className="w-full p-3 rounded-xl bg-zinc-100 border border-zinc-200 text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]/20"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-zinc-600 mb-1 block">Height</label>
                    <input
                      type="number"
                      value={customAspectHeight}
                      onChange={e => setCustomAspectHeight(e.target.value)}
                      placeholder="1080"
                      className="w-full p-3 rounded-xl bg-zinc-100 border border-zinc-200 text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-600 mb-2 block">Unit</label>
                  <div className="flex gap-2">
                    {['px', 'in', 'cm', 'mm'].map(unit => (
                      <button
                        key={unit}
                        onClick={() => setCustomAspectUnit(unit)}
                        className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all
                          ${customAspectUnit === unit
                            ? 'bg-[var(--accent-color)] text-white'
                            : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 border border-zinc-200'}`}
                      >
                        {unit === 'px' ? 'Pixels' : unit === 'in' ? 'Inches' : unit === 'cm' ? 'cm' : 'mm'}
                      </button>
                    ))}
                  </div>
                </div>

                <p className="text-[10px] text-zinc-400 text-center">
                  💡 Common sizes: 1920×1080 (Full HD), 3840×2160 (4K), 1080×1080 (Instagram)
                </p>

                <button
                  onClick={handleSaveCustomAspectRatio}
                  disabled={!customAspectWidth || !customAspectHeight}
                  className="w-full py-3.5 rounded-xl font-bold text-sm text-white bg-[var(--accent-color)] hover:bg-[var(--accent-color-dark)] disabled:bg-zinc-300 disabled:cursor-not-allowed transition-all shadow-lg"
                >
                  Add Custom Size
                </button>
              </div>
            </div>
          </div>
        )
      }

    </div >
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

