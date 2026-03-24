# 🎨 Pollinations AI Image Generator

> **Transform your imagination into stunning visuals with AI-powered image generation and editing**


[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38bdf8?logo=tailwind-css)](https://tailwindcss.com)
[![Pollinations AI](https://img.shields.io/badge/Pollinations-API-orange?logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0iI2ZmNjYwMCIgZD0iTTEyIDJMMTQgN2w1LTFsLTMgNCAzIDRsLTUgMWwyIDVsLTQtMy00IDMgMi01LTUtMSAzLTRsLTMtNCA1IDF6Ii8+PC9zdmc+)](https://pollinations.ai)
[![Vercel](https://img.shields.io/badge/Vercel-Deploy-black?logo=vercel)](https://vercel.com)

---

## ✨ Features

| 🖼️ **Image Generation** | 🎬 **Video Generation** | ✏️ **Image Editing** |
|-------------------------|-------------------------|----------------------|
| Generate from text prompts | Create videos from text | Transform existing images |
| 38+ AI models available | Multiple video models | AI-powered edits |
| Style presets included | HD quality options | Reference image support |

| 🎨 **Style Presets** | 📚 **History** | ⚙️ **Settings** |
|----------------------|----------------|-----------------|
| Cinematic, Anime, 3D | Local storage | API key management |
| Photorealistic, Art | Gallery view | Custom preferences |
| Quick apply styles | Download & share | Model selection |

---

## 🚀 Quick Start

### Prerequisites

```bash
Node.js 18+    # Required
npm or yarn    # Package manager
Git            # For cloning
```

### Installation

```bash
# Clone the repository
git clone https://github.com/namandhakad72/Image-Gen-Editor.git
cd Image-Gen-Editor

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) 🎉

### Get Your API Key

1. Visit [enter.pollinations.ai](https://enter.pollinations.ai)
2. Create a free account
3. Copy your API key
4. Add it in the app Settings page

> 💡 **Free tier includes hourly pollen refills!**

---

## 📸 Screenshots

### Generate Tab
```
┌─────────────────────────────────────────────────────────┐
│  🎨 Pollinations AI                    Generate History │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Enter your prompt...                           │   │
│  │  A cyberpunk city at night with neon lights...  │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  🎭 Style: [Cinematic ▼]  🤖 Model: [Flux ▼]          │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │                                                 │   │
│  │           [Generated Image Preview]             │   │
│  │                                                 │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│              [✨ Generate Image]                        │
└─────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

```
┌─────────────────────────────────────────────────────┐
│  Framework       │ Next.js 14 (App Router)          │
│  Language        │ TypeScript 5                     │
│  Styling         │ Tailwind CSS 3                   │
│  Icons           │ Lucide React                     │
│  Notifications   │ Sonner                           │
│  Deployment      │ Vercel                           │
│  AI Backend      │ Pollinations AI API              │
└─────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
pollinations-app/
├── src/
│   ├── app/                  # Next.js App Router
│   │   ├── layout.tsx        # Root layout
│   │   ├── page.tsx          # Home (Generate)
│   │   ├── edit/             # Image editing page
│   │   ├── history/          # Generation history
│   │   └── settings/         # API configuration
│   ├── components/           # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── ImageCard.tsx
│   │   ├── ModelSelector.tsx
│   │   └── ...
│   ├── lib/                  # Utilities & API
│   │   ├── api.ts
│   │   └── utils.ts
│   └── types/                # TypeScript definitions
├── public/                   # Static assets
├── vercel.json               # Vercel configuration
└── package.json
```

---

## 🎯 Available Models

### Image Generation
| Model | Speed | Quality | Cost |
|-------|-------|---------|------|
| **Flux Schnell** | ⚡⚡⚡ | ⭐⭐⭐ | Free |
| **Z-Image Turbo** | ⚡⚡⚡ | ⭐⭐⭐⭐ | Low |
| **GPT Image 1.5** | ⚡⚡ | ⭐⭐⭐⭐⭐ | High |
| **NanoBanana Pro** | ⚡⚡ | ⭐⭐⭐⭐ | Medium |
| **FLUX.2 Klein** | ⚡ | ⭐⭐⭐⭐⭐ | High |

### Video Generation
- **Wan 2.6** - High quality video generation
- **Veo 3.1** - Google's video model
- **Seedance** - Fast video synthesis
- **LTX-2** - Extended video generation

---

## 🚀 Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/namandhakad72/Image-Gen-Editor)

### One-Click Deploy

1. Click the button above
2. Connect your GitHub account
3. Configure environment variables (optional)
4. Deploy!

### Manual Deploy

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Deploy to production
vercel --prod
```

---

## 📖 API Reference

### Generate Image

```typescript
POST https://gen.pollinations.ai/v1/images/generations

{
  "prompt": "A beautiful sunset over mountains",
  "model": "flux-schnell",
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
  "image": "base64_encoded_image",
  "strength": 0.7,
  "model": "flux-edit"
}
```

---

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

## 🔗 Links

- **[Live Demo](https://image-gen-editor.vercel.app)** (deploy your own)
- **[API Documentation](https://gen.pollinations.ai/api/docs)**
- **[Get API Key](https://enter.pollinations.ai)**
- **[Report Bug](https://github.com/namandhakad72/Image-Gen-Editor/issues)**
- **[Request Feature](https://github.com/namandhakad72/Image-Gen-Editor/issues)**

---

## 💬 Support

If you have any questions or need help:

- 📧 Email: [Contact via GitHub](https://github.com/namandhakad72)
- 💬 Issues: [GitHub Issues](https://github.com/namandhakad72/Image-Gen-Editor/issues)
- 📚 Docs: [Pollinations API Docs](https://gen.pollinations.ai)

---

<div align="center">

**Made with ❤️ by [namandhakad72](https://github.com/namandhakad72)**

[![GitHub stars](https://img.shields.io/github/stars/namandhakad72/Image-Gen-Editor?style=social)](https://github.com/namandhakad72/Image-Gen-Editor/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/namandhakad72/Image-Gen-Editor?style=social)](https://github.com/namandhakad72/Image-Gen-Editor/network)

</div>
