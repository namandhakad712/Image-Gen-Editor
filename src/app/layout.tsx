import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'sonner';
import { Navigation } from '@/components/Navigation';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Pollinations AI - Image Generator & Editor',
  description: 'Create stunning images with AI using Pollinations API. Generate and edit images with 38+ AI models.',
  keywords: ['AI', 'Image Generation', 'Pollinations', 'AI Art', 'Image Editor'],
  authors: [{ name: 'namandhakad712' }],
  openGraph: {
    title: 'Pollinations AI - Image Generator & Editor',
    description: 'Create stunning images with AI using Pollinations API',
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
      <body className={`${inter.className} selection:bg-[#EF8354] selection:text-white`}>
        <Navigation />
        <main className="md:pl-64 min-h-screen">
          {children}
        </main>
        <Toaster
          position="top-right"
          richColors
          theme="light"
          toastOptions={{
            style: {
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.9)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            },
          }}
        />
      </body>
    </html>
  );
}
