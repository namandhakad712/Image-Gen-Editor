<div align="center">

# 🎨 Image Gen Editor Pro

### _Transform your imagination into stunning AI-powered visuals_

![Banner](https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=1200&h=400&fit=crop)

[![Built with Pollinations](https://img.shields.io/badge/Built%20with-Pollinations-8a2be2?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0iI2ZmNjYwMCIgZD0iTTEyIDJMMTQgN2w1LTFsLTMgNCAzIDRsLTUgMWwyIDVsLTQtMy00IDMgMi01LTUtMSAzLTRsLTMtNCA1IDF6Ii8+PC9zdmc+)](https://pollinations.ai)
[![Next.js 14](https://img.shields.io/badge/Next.js-14-000000?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38BDF8?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com)
[![Vercel](https://img.shields.io/badge/Vercel-Deploy-000000?style=for-the-badge&logo=vercel)](https://vercel.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)

[**Live Demo**](https://image-gen-editor.vercel.app) • [**Documentation**](https://gen.pollinations.ai) • [**Report Issue**](https://github.com/namandhakad712/Image-Gen-Editor/issues)

</div>

---

## 🌟 What is Image Gen Editor Pro?

> **A production-ready, AI-powered image generation and editing platform** built with Next.js 14, TypeScript, and Tailwind CSS. Create stunning visuals from text prompts, edit existing images with AI, and explore your creativity — **completely free** with Pollinations AI.

### ✨ Key Features

- **🖼️ AI Image Generation** - 18+ AI models including Flux, GPT Image, NanoBanana, Seedream
- **🎬 Video Generation** - Text-to-video with Veo, Seedance, Wan models
- **✏️ AI Image Editing** - Edit images using reference images + prompts
- **🎨 Infinite Canvas** - Pan, zoom, and arrange multiple generated images
- **🔧 Advanced Controls** - Style strength, guidance scale, steps, negative prompts
- **📚 History Management** - LocalStorage-based generation history
- **🎯 Batch Generation** - Generate up to 10 images at once
- **🌈 Custom Themes** - 100+ accent colors
- **🔐 BYOP Integration** - Let users pay for their own API usage

---

## 🚀 Quick Start

### Prerequisites

Ensure you have the following installed:

- **Node.js** 18+ ([Download](https://nodejs.org))
- **npm** or **yarn**
- **Git** ([Download](https://git-scm.com))

Verify installations:
```bash
node --version  # Should be v18 or higher
npm --version
git --version
```

### Installation

```bash
# 📥 Clone the repository
git clone https://github.com/namandhakad712/Image-Gen-Editor.git
cd Image-Gen-Editor/pollinations-app

# 📦 Install dependencies
npm install

# 📝 Copy environment variables
cp .env.example .env.local

# 🏃 Start development server
npm run dev
```

The app will open at **[http://localhost:3000](http://localhost:3000)** 🎉

### Environment Variables

Copy `.env.example` to `.env.local` and configure:

```bash
# Required: Pollinations API (default works without changes)
NEXT_PUBLIC_POLLINATIONS_API_URL=https://gen.pollinations.ai
NEXT_PUBLIC_POLLINATIONS_MEDIA_URL=https://media.pollinations.ai

# Optional: Enable debug logging
NEXT_PUBLIC_DEBUG_MODE=false

# Optional: Rate limiting (requests per minute)
NEXT_PUBLIC_RATE_LIMIT_REQUESTS=60

# Optional: Cache TTL in milliseconds
NEXT_PUBLIC_CACHE_TTL=300000
```

---

## 🔑 Get Your Free API Key

1. Visit [enter.pollinations.ai](https://enter.pollinations.ai)
2. Create a free account (GitHub sign-in available)
3. Copy your API key
4. Paste it in the app Settings page

> 💡 **Free tier includes hourly pollen refills!** No credit card required.

### API Key Types

| Type | Prefix | Use Case | Rate Limits |
|------|--------|----------|-------------|
| **Secret** | `sk_` | Server-side only | None |
| **Publishable** | `pk_` | Client-side apps | 1 pollen/IP/hour |

⚠️ **Never expose secret keys in client-side code!**

---

## 🛠️ Tech Stack

| Component | Technology | Version |
|-----------|------------|---------|
| Framework | Next.js 14 (App Router) | 14.2.3 |
| Language | TypeScript | 5.4.5 |
| Styling | Tailwind CSS | 3.4.3 |
| Icons | Lucide React | 0.378.0 |
| Notifications | Sonner | 1.4.41 |
| Analytics | Vercel Analytics | 2.0.1 |
| Deployment | Vercel | - |
| AI Backend | Pollinations AI API | - |

### Development Tools

- **ESLint** - Code linting
- **Prettier** - Code formatting (via ESLint)
- **PostCSS** - CSS processing
- **Autoprefixer** - CSS vendor prefixes

---

## 📁 Project Structure

```
pollinations-app/
├── 📂 src/
│   ├── 📂 app/                    # Next.js App Router
│   │   ├── 📄 layout.tsx          # Root layout + SEO + Providers
│   │   ├── 📄 page.tsx            # Home - Infinite canvas generator
│   │   ├── 📄 Providers.tsx       # App providers wrapper
│   │   ├── 📂 gallery/            # Community gallery
│   │   ├── 📂 history/            # Generation history
│   │   ├── 📂 settings/           # API configuration
│   │   ├── 📂 usage/              # Usage dashboard
│   │   └── 📂 video/              # Video generation
│   ├── 📂 components/             # Reusable UI components
│   │   └── 📄 ErrorBoundary.tsx   # Error boundary component
│   ├── 📂 lib/                    # Utilities & API
│   │   ├── 📄 api.ts              # PollinationsAPI client (with retry/rate-limit)
│   │   ├── 📄 env.ts              # Environment configuration
│   │   ├── 📄 styles.ts           # Art styles library
│   │   ├── 📄 prompts.ts          # Prompt templates
│   │   ├── 📄 theme.tsx           # Theme customization
│   │   └── 📄 utils.ts            # Helper functions
│   └── 📂 types/                  # TypeScript definitions
│       └── 📄 index.ts            # Type definitions
├── 📂 public/                     # Static assets
├── 📄 .env.example                # Environment variables template
├── 📄 next.config.mjs             # Next.js configuration
├── 📄 tailwind.config.ts          # Tailwind CSS configuration
├── 📄 tsconfig.json               # TypeScript configuration
├── 📄 vercel.json                 # Vercel deployment config
└── 📄 package.json
```

---

## 📖 Available Scripts

```bash
# Development
npm run dev          # Start development server (http://localhost:3000)

# Production
npm run build        # Build for production
npm start            # Start production server

# Code Quality
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint errors automatically

# Type Checking
npx tsc --noEmit     # Check TypeScript types
```

---

## 🎨 Custom Theme Color

### Personalize Your Experience!

Choose your favorite accent color from **100+ colors** in the Settings panel. Your choice is saved locally and applied across the entire app!

**Popular Colors:**
- 🟠 **Sunset Orange** (Default) `#EF8354`
- 🔵 **Ocean Blue** `#3B82F6`
- 🟣 **Royal Purple** `#8B5CF6`
- 🟢 **Emerald Green** `#10B981`
- 🔴 **Ruby Red** `#EF4444`
- 🌸 **Sakura Pink** `#EC4899`

---

## 🚀 Deploy to Vercel

<div align="center">

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/namandhakad712/Image-Gen-Editor/tree/main/pollinations-app)

</div>

### One-Click Deploy

1. Click the **Deploy** button above
2. Connect your GitHub account
3. Configure environment variables
4. Deploy! ✨

### Manual Deploy

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

### Deploy to Other Platforms

#### Netlify
```bash
npm run build
# Connect to Netlify and set build command: npm run build
# Publish directory: .next (for Next.js) or out (for static export)
```

#### Docker
```bash
docker build -t image-gen-editor .
docker run -p 3000:3000 image-gen-editor
```

---

## 📡 API Reference

### Generate Image

```typescript
POST https://gen.pollinations.ai/v1/images/generations

{
  "prompt": "A beautiful sunset over mountains",
  "model": "flux",
  "n": 1,
  "size": "1024x1024",
  "response_format": "url"
}
```

### Edit Image

```typescript
POST https://gen.pollinations.ai/v1/images/edits

{
  "prompt": "Add a rainbow in the sky",
  "image": "base64_encoded_image_or_url",
  "model": "flux"
}
```

### Generate Video

```typescript
GET https://gen.pollinations.ai/video/{prompt}?model=veo&duration=5
```

### Available Models

**Image Models (18+):**
- `flux` - Flux Schnell (fast, free)
- `zimage` - Z-Image Turbo
- `gptimage` - GPT Image 1 Mini
- `gptimage-large` - GPT Image 1.5
- `nanobanana` - NanoBanana (Gemini)
- `nanobanana-pro` - NanoBanana Pro
- `seedream5` - Seedream 5.0 Lite
- `kontext` - FLUX.1 Kontext
- `klein` - FLUX.2 Klein 4B
- And more...

**Video Models:**
- `veo` - Veo 3.1 Fast
- `seedance` - Seedance Lite
- `wan` - Wan 2.6
- `ltx-2` - LTX-2

---

## 🧪 Testing

### Manual Testing Checklist

- [ ] Image generation with different models
- [ ] Image editing with reference images
- [ ] Video generation
- [ ] Batch generation
- [ ] History management
- [ ] Theme customization
- [ ] API key management
- [ ] BYOP OAuth flow
- [ ] Mobile responsiveness
- [ ] Error handling

### Automated Testing (Coming Soon)

```bash
npm run test          # Run tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

---

## 🤝 Contributing

<div align="center">

### We Welcome Contributions! 🎉

This is an **open-source community project**. Whether you're fixing bugs, adding features, or improving documentation — every contribution matters!

</div>

#### How to Contribute:

1. **⭐ Star** this repository
2. **🍴 Fork** the repository
3. **🌿 Create a branch** (`git checkout -b feature/amazing-feature`)
4. **💾 Commit** your changes (`git commit -m 'Add amazing feature'`)
5. **📤 Push** to the branch (`git push origin feature/amazing-feature`)
6. **🔀 Open a Pull Request**

#### What You Can Contribute:

- 🐛 Bug fixes
- ✨ New features
- 📝 Documentation improvements
- 🎨 UI/UX enhancements
- 🌍 Translations
- 🧪 Tests

#### Development Guidelines

1. **Code Style**: Follow existing conventions (ESLint rules)
2. **TypeScript**: Use strict typing
3. **Components**: Functional components with hooks
4. **Testing**: Add tests for new features
5. **Documentation**: Update docs for changes

---

## 📄 License

This project is licensed under the **[MIT License](LICENSE)** — feel free to use it for personal and commercial projects!

```
MIT License

Copyright (c) 2024 Image Gen Editor

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software...
```

---

## 🔗 Links

| Resource | URL |
|----------|-----|
| **Live Demo** | [image-gen-editor.vercel.app](https://image-gen-editor.vercel.app) |
| **API Docs** | [gen.pollinations.ai](https://gen.pollinations.ai) |
| **Get API Key** | [enter.pollinations.ai](https://enter.pollinations.ai) |
| **GitHub Issues** | [github.com/namandhakad712/Image-Gen-Editor/issues](https://github.com/namandhakad712/Image-Gen-Editor/issues) |

---

## 💬 Support

<div align="center">

**Need help?** We're here for you!

- 📧 **GitHub:** [@namandhakad712](https://github.com/namandhakad712)
- 💬 **Issues:** [GitHub Issues](https://github.com/namandhakad712/Image-Gen-Editor/issues)
- 📚 **Docs:** [Pollinations API](https://gen.pollinations.ai)

</div>

---

## 🏆 Contributors

<!-- Use GitHub API to fetch contributors dynamically -->
[![Contributors](https://contrib.rocks/image?repo=namandhakad712/Image-Gen-Editor)](https://github.com/namandhakad712/Image-Gen-Editor/graphs/contributors)

---

<div align="center">

### Made with ❤️ by [namandhakad712](https://github.com/namandhakad712)

**🌟 If you like this project, please give it a star!**

[![GitHub stars](https://img.shields.io/github/stars/namandhakad712/Image-Gen-Editor?style=social&label=Star)](https://github.com/namandhakad712/Image-Gen-Editor/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/namandhakad712/Image-Gen-Editor?style=social&label=Fork)](https://github.com/namandhakad712/Image-Gen-Editor/network)
[![GitHub watchers](https://img.shields.io/github/watchers/namandhakad712/Image-Gen-Editor?style=social&label=Watch)](https://github.com/namandhakad712/Image-Gen-Editor)
[![GitHub followers](https://img.shields.io/github/followers/namandhakad712?style=social&label=Follow)](https://github.com/namandhakad712)

---

<p align="center">
  <sub>
    Built with 🚀 Next.js • 🎨 Tailwind CSS • 🤖 Pollinations AI
    <br/>
    Released under the <a href="LICENSE">MIT License</a>
  </sub>
</p>

</div>
