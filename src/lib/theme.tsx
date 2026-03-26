'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

interface ThemeContextType {
  accentColor: string;
  setAccentColor: (color: string) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  accentColor: 'var(--accent-color)',
  setAccentColor: () => {},
});

export const useTheme = () => useContext(ThemeContext);

// Predefined color palette for quick selection (optional)
export const COLOR_PALETTE = [
  { name: 'Sunset Orange', value: 'var(--accent-color)' },
  { name: 'Ocean Blue', value: '#3B82F6' },
  { name: 'Royal Purple', value: '#8B5CF6' },
  { name: 'Emerald Green', value: '#10B981' },
  { name: 'Ruby Red', value: '#EF4444' },
  { name: 'Sakura Pink', value: '#EC4899' },
  { name: 'Golden Yellow', value: '#F59E0B' },
  { name: 'Teal Cyan', value: '#14B8A6' },
  { name: 'Indigo', value: '#6366F1' },
  { name: 'Rose', value: '#F43F5E' },
  { name: 'Amber', value: '#F97316' },
  { name: 'Lime', value: '#84CC16' },
];

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [accentColor, setAccentColorState] = useState('var(--accent-color)');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('pollinations_accent_color');
    if (saved) {
      setAccentColorState(saved);
      updateCSSVariables(saved);
    }
  }, []);

  const updateCSSVariables = (color: string) => {
    document.documentElement.style.setProperty('--accent-color', color);
    document.documentElement.style.setProperty('--accent-color-light', `${color}20`);
    document.documentElement.style.setProperty('--accent-color-border', `${color}40`);
    // Update theme-color meta tag for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', color);
    }
  };

  const setAccentColor = (color: string) => {
    setAccentColorState(color);
    localStorage.setItem('pollinations_accent_color', color);
    updateCSSVariables(color);
  };

  if (!mounted) {
    // Return a minimal provider during SSR to avoid hydration mismatch
    return (
      <ThemeContext.Provider value={{ accentColor, setAccentColor }}>
        {children}
      </ThemeContext.Provider>
    );
  }

  return (
    <ThemeContext.Provider value={{ accentColor, setAccentColor }}>
      {children}
    </ThemeContext.Provider>
  );
}

