import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  title: 'Image Gen Editor — AI Image Generator & Editor',
  description: 'Create and edit stunning AI images with a beautiful spatial canvas. Powered by Pollinations AI with 8+ models including Flux, GPT Image, NanoBanana, and more.',
  keywords: 'AI image generator, image editor, Pollinations AI, Flux, GPT Image, text to image, AI art',
  openGraph: {
    title: 'Image Gen Editor — AI Image Generator & Editor',
    description: 'Create and edit stunning AI images with a beautiful spatial canvas. Powered by Pollinations AI.',
    url: 'https://image-gen-editor.vercel.app',
    siteName: 'Image Gen Editor',
    type: 'website',
  },
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
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      </head>
      <body className="selection:bg-[#EF8354] selection:text-white">
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
        />
      </body>
    </html>
  );
}
