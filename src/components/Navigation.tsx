'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Image as ImageIcon, Wand2, History, Settings, Sparkles } from 'lucide-react';

const navItems = [
  { href: '/', label: 'Generate', icon: Wand2 },
  { href: '/edit', label: 'Edit', icon: ImageIcon },
  { href: '/history', label: 'History', icon: History },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 md:top-0 md:bottom-auto md:w-64 md:right-auto border-t md:border-t-0 md:border-r border-input bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
      <div className="flex md:flex-col justify-around md:justify-start md:p-4 md:gap-2">
        {/* Logo - Desktop */}
        <div className="hidden md:flex items-center gap-2 px-3 py-4 mb-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold text-foreground">Pollinations</span>
        </div>

        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col md:flex-row items-center md:gap-3 px-3 py-3 md:py-2.5 rounded-lg transition-all ${
                isActive
                  ? 'text-primary bg-accent/50'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/20'
              }`}
            >
              <Icon className="h-5 w-5 md:h-4 md:w-4" />
              <span className="text-xs md:text-sm font-medium mt-1 md:mt-0">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
