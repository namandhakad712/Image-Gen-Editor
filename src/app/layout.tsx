import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Pollinations AI - Infinite Canvas Image Generator',
  description: 'Create stunning images with AI on an infinite canvas. Generate and edit images with 38+ AI models.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} selection:bg-[#EF8354] selection:text-white`}>
        {children}
        <Toaster
          position="bottom-center"
          richColors
          theme="dark"
          toastOptions={{
            style: {
              background: 'rgba(20, 20, 30, 0.95)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#fff',
            },
          }}
        />
      </body>
    </html>
  );
}
