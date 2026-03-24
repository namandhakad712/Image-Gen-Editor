import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import { Navigation } from '@/components/Navigation';
import './globals.css';

export const metadata: Metadata = {
  title: 'Pollinations AI - Image Generator',
  description: 'Generate stunning images with AI using Pollinations API',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background antialiased pb-20 md:pb-0 md:pl-64">
        <Navigation />
        <main className="container mx-auto px-4 py-6 md:py-8 max-w-7xl">
          {children}
        </main>
        <Toaster
          position="top-right"
          richColors
          theme="dark"
          toastOptions={{
            style: {
              background: 'hsl(240 10% 5.9%)',
              color: 'hsl(0 0% 98%)',
              border: '1px solid hsl(240 4% 16%)',
            },
          }}
        />
      </body>
    </html>
  );
}
