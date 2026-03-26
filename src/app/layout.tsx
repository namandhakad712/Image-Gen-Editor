import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from 'sonner';
import { ThemeProvider } from '@/lib/theme';
import { Providers } from './Providers';
import { Analytics } from '@vercel/analytics/react';

const APP_NAME = 'Image Gen Editor';
const APP_DEFAULT_TITLE = 'Image Gen Editor — AI Image Generator & Editor';
const APP_TITLE_TEMPLATE = '%s — Image Gen Editor';
const APP_DESCRIPTION = 'Create and edit stunning AI images with a beautiful spatial canvas. Powered by Pollinations AI with 18+ models including Flux, GPT Image, NanoBanana, Seedream, and more.';
const APP_URL = 'https://image-gen-editor.vercel.app';

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: {
    default: APP_DEFAULT_TITLE,
    template: APP_TITLE_TEMPLATE,
  },
  description: APP_DESCRIPTION,
  keywords: [
    'AI image generator',
    'image editor',
    'Pollinations AI',
    'Flux',
    'GPT Image',
    'NanoBanana',
    'Seedream',
    'text to image',
    'AI art',
    'image editing',
    'AI video generation',
    'text to video',
  ],
  authors: [{ name: 'Image Gen Editor Team' }],
  creator: 'Image Gen Editor',
  publisher: 'Image Gen Editor',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  metadataBase: new URL(APP_URL),
  openGraph: {
    type: 'website',
    siteName: APP_NAME,
    title: {
      default: APP_DEFAULT_TITLE,
      template: APP_TITLE_TEMPLATE,
    },
    description: APP_DESCRIPTION,
    url: APP_URL,
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Image Gen Editor - AI Image Generator',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: {
      default: APP_DEFAULT_TITLE,
      template: APP_TITLE_TEMPLATE,
    },
    description: APP_DESCRIPTION,
    images: ['/og-image.png'],
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: APP_DEFAULT_TITLE,
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: APP_URL,
  },
};

export const viewport: Viewport = {
  themeColor: '#EF8354',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Preconnect to Pollinations API for faster requests */}
        <link rel="preconnect" href="https://gen.pollinations.ai" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://media.pollinations.ai" crossOrigin="anonymous" />
        {/* DNS prefetch for analytics */}
        <link rel="dns-prefetch" href="https://analytics.vercel.com" />
      </head>
      <body className="selection:bg-[#EF8354] selection:text-white antialiased">
        <Providers>
          <ThemeProvider>
            {children}
            <Toaster
              position="bottom-center"
              richColors
              theme="light"
              toastOptions={{
                style: {
                  background: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.9)',
                  color: '#3f3f46',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
                  borderRadius: '16px',
                },
              }}
              visibleToasts={5}
              closeButton
            />
          </ThemeProvider>
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
