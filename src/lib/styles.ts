// Art Styles Library - Inspired by Perchance AI
// Each style has: prompt (prefix/suffix), negative prompt, and optional modifiers

export interface ArtStyle {
  id: string;
  label: string;
  prompt: string;
  negative: string;
  category?: string;
  icon?: string;
}

export const ART_STYLES: ArtStyle[] = [
  // ==================== NO STYLE ====================
  {
    id: 'no-style',
    label: '🎨 No Style',
    prompt: '',
    negative: '',
    category: 'Basic',
  },

  // ==================== PHOTOGRAPHY ====================
  {
    id: 'photorealistic',
    label: '📷 Photorealistic',
    prompt: 'photorealistic, hyperrealistic, ultra detailed, 8K resolution, professional photography',
    negative: 'cartoon, anime, drawing, painting, illustration, 3d render, low quality, blurry',
    category: 'Photography',
    icon: '📷',
  },
  {
    id: 'portrait',
    label: '👤 Portrait Photography',
    prompt: 'professional portrait photography, studio lighting, sharp focus on face, bokeh background',
    negative: 'cartoon, anime, drawing, deformed, blurry, low quality',
    category: 'Photography',
  },
  {
    id: 'cinematic',
    label: '🎬 Cinematic',
    prompt: 'cinematic still, movie screenshot, dramatic lighting, color graded, anamorphic lens, film grain',
    negative: 'cartoon, anime, drawing, low quality, flat lighting',
    category: 'Photography',
  },
  {
    id: 'polaroid',
    label: '📸 Polaroid',
    prompt: 'polaroid photo, vintage aesthetic, film grain, light leaks, dated border',
    negative: 'digital, clean, modern, low quality',
    category: 'Photography',
  },
  {
    id: 'golden-hour',
    label: '🌅 Golden Hour',
    prompt: 'golden hour lighting, warm sunlight, lens flare, dreamy atmosphere',
    negative: 'harsh lighting, midday sun, cold tones',
    category: 'Photography',
  },

  // ==================== ART STYLES ====================
  {
    id: 'oil-painting',
    label: '🎨 Oil Painting',
    prompt: 'oil painting, visible brushstrokes, impasto technique, classical art style',
    negative: 'photograph, digital art, 3d render, low quality',
    category: 'Art',
  },
  {
    id: 'watercolor',
    label: '💧 Watercolor',
    prompt: 'watercolor painting, soft edges, paint bleeding, paper texture, delicate washes',
    negative: 'photograph, digital, harsh lines, 3d render',
    category: 'Art',
  },
  {
    id: 'anime',
    label: '🌸 Anime',
    prompt: 'anime style, studio ghibli, makoto shinkai, vibrant colors, detailed background',
    negative: 'realistic, photograph, western cartoon, low quality',
    category: 'Art',
  },
  {
    id: 'manga',
    label: '📖 Manga',
    prompt: 'manga style, black and white, screen tones, japanese comic art',
    negative: 'color, realistic, photograph, western comic',
    category: 'Art',
  },
  {
    id: 'pixel-art',
    label: '👾 Pixel Art',
    prompt: 'pixel art, 16-bit, retro game aesthetic, limited color palette',
    negative: 'smooth, high resolution, photograph, 3d',
    category: 'Art',
  },
  {
    id: 'cyberpunk',
    label: '🤖 Cyberpunk',
    prompt: 'cyberpunk, neon lights, futuristic city, rain-soaked streets, blade runner aesthetic',
    negative: 'natural, pastoral, historical, low quality',
    category: 'Art',
  },
  {
    id: 'steampunk',
    label: '⚙️ Steampunk',
    prompt: 'steampunk, victorian era, brass gears, steam machinery, clockwork aesthetic',
    negative: 'modern, futuristic, digital, low quality',
    category: 'Art',
  },
  {
    id: 'art-nouveau',
    label: '🌺 Art Nouveau',
    prompt: 'art nouveau, alphonse mucha, flowing organic lines, decorative, ornate',
    negative: 'modern, geometric, minimalist, low quality',
    category: 'Art',
  },
  {
    id: 'art-deco',
    label: '🏛️ Art Deco',
    prompt: 'art deco, geometric patterns, gold accents, 1920s elegance, great gatsby style',
    negative: 'organic, rustic, modern minimalist',
    category: 'Art',
  },
  {
    id: 'impressionism',
    label: '🎨 Impressionism',
    prompt: 'impressionist painting, monet style, visible brushstrokes, light and color focus',
    negative: 'photorealistic, sharp details, digital art',
    category: 'Art',
  },
  {
    id: 'van-gogh',
    label: '🌻 Van Gogh Style',
    prompt: 'in the style of van gogh, swirling brushstrokes, vibrant colors, starry night aesthetic',
    negative: 'photorealistic, smooth, digital',
    category: 'Art',
  },
  {
    id: 'ukiyo-e',
    label: '🗾 Ukiyo-e',
    prompt: 'ukiyo-e woodblock print, japanese traditional art, hokusai style, flat colors',
    negative: 'western art, 3d, photorealistic',
    category: 'Art',
  },

  // ==================== 3D & DIGITAL ====================
  {
    id: '3d-render',
    label: '💎 3D Render',
    prompt: '3d render, octane render, unreal engine 5, ray tracing, photorealistic lighting',
    negative: '2d, drawing, painting, low poly',
    category: '3D',
  },
  {
    id: 'low-poly',
    label: '🔺 Low Poly',
    prompt: 'low poly, geometric, angular, minimalist 3d, faceted surfaces',
    negative: 'smooth, detailed, photorealistic, 2d',
    category: '3D',
  },
  {
    id: 'voxel',
    label: '🧊 Voxel Art',
    prompt: 'voxel art, 3d pixel art, minecraft aesthetic, blocky, cubic',
    negative: 'smooth, 2d, photograph, low quality',
    category: '3D',
  },
  {
    id: 'isometric',
    label: '📐 Isometric',
    prompt: 'isometric view, 3d isometric, technical illustration, cutaway view',
    negative: 'perspective view, 2d, flat',
    category: '3D',
  },

  // ==================== FANTASY ====================
  {
    id: 'fantasy',
    label: '🐉 Fantasy Art',
    prompt: 'fantasy art, magical atmosphere, ethereal lighting, epic composition',
    negative: 'modern, realistic, mundane, low quality',
    category: 'Fantasy',
  },
  {
    id: 'dnd',
    label: '🎲 D&D Style',
    prompt: 'dungeons and dragons art style, fantasy rpg illustration, wizards of the coast style',
    negative: 'modern, sci-fi, low quality',
    category: 'Fantasy',
  },
  {
    id: 'mtg',
    label: '🃏 MTG Card Style',
    prompt: 'magic the gathering card art, fantasy illustration, incredible mtg artwork',
    negative: 'modern, sci-fi, low quality, deformed',
    category: 'Fantasy',
  },

  // ==================== SCI-FI ====================
  {
    id: 'sci-fi',
    label: '🚀 Sci-Fi',
    prompt: 'science fiction, futuristic, space age, advanced technology',
    negative: 'historical, fantasy, low quality',
    category: 'Sci-Fi',
  },
  {
    id: 'space-opera',
    label: '🌌 Space Opera',
    prompt: 'space opera, epic space battles, star wars aesthetic, grand scale',
    negative: 'earth setting, historical, low quality',
    category: 'Sci-Fi',
  },

  // ==================== MINIMALIST ====================
  {
    id: 'minimalist',
    label: '⚪ Minimalist',
    prompt: 'minimalist, clean lines, simple composition, negative space, less is more',
    negative: 'cluttered, ornate, complex, busy',
    category: 'Minimalist',
  },
  {
    id: 'flat-design',
    label: '🔲 Flat Design',
    prompt: 'flat design, 2d, solid colors, simple shapes, modern ui aesthetic',
    negative: '3d, realistic, detailed, skeuomorphic',
    category: 'Minimalist',
  },

  // ==================== VINTAGE ====================
  {
    id: 'vintage',
    label: '📻 Vintage',
    prompt: 'vintage aesthetic, retro, aged, nostalgic, old photograph',
    negative: 'modern, digital, clean, new',
    category: 'Vintage',
  },
  {
    id: 'noir',
    label: '🌑 Film Noir',
    prompt: 'film noir, black and white, dramatic shadows, high contrast, 1940s aesthetic',
    negative: 'color, bright, cheerful, modern',
    category: 'Vintage',
  },
  {
    id: 'sepia',
    label: '📜 Sepia',
    prompt: 'sepia tone, antique photograph, aged, victorian era',
    negative: 'color, modern, digital',
    category: 'Vintage',
  },

  // ==================== HORROR ====================
  {
    id: 'horror',
    label: '👻 Horror',
    prompt: 'horror aesthetic, dark atmosphere, eerie lighting, unsettling mood',
    negative: 'cheerful, bright, cute, low quality',
    category: 'Horror',
  },
  {
    id: 'gothic',
    label: '🦇 Gothic',
    prompt: 'gothic aesthetic, dark romantic, victorian gothic, ornate, moody',
    negative: 'bright, cheerful, modern, minimalist',
    category: 'Horror',
  },

  // ==================== CUTE ====================
  {
    id: 'kawaii',
    label: '🌟 Kawaii',
    prompt: 'kawaii style, cute, pastel colors, japanese cute aesthetic, sparkles',
    negative: 'dark, realistic, horror, low quality',
    category: 'Cute',
  },
  {
    id: 'chibi',
    label: '👶 Chibi',
    prompt: 'chibi style, super deformed, cute proportions, large head small body',
    negative: 'realistic proportions, serious, dark',
    category: 'Cute',
  },

  // ==================== COMIC ====================
  {
    id: 'comic',
    label: '💥 Comic Book',
    prompt: 'comic book art, marvel dc style, bold lines, vibrant colors, speech bubbles',
    negative: 'realistic, photograph, muted colors',
    category: 'Comic',
  },
  {
    id: 'graphic-novel',
    label: '📚 Graphic Novel',
    prompt: 'graphic novel art, frank miller style, high contrast, detailed linework',
    negative: 'colorful, cartoon, low quality',
    category: 'Comic',
  },
];

// Categories for filtering
export const STYLE_CATEGORIES = Array.from(new Set(ART_STYLES.map(s => s.category))).filter(Boolean) as string[];

// Helper function to get random style
export function getRandomStyle(): ArtStyle {
  return ART_STYLES[Math.floor(Math.random() * ART_STYLES.length)];
}

// Helper function to get style by ID
export function getStyleById(id: string): ArtStyle | undefined {
  return ART_STYLES.find(s => s.id === id);
}

// Helper function to get styles by category
export function getStylesByCategory(category: string): ArtStyle[] {
  return ART_STYLES.filter(s => s.category === category);
}
