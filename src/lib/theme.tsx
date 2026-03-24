'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

interface ThemeContextType {
  accentColor: string;
  setAccentColor: (color: string) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  accentColor: '#EF8354',
  setAccentColor: () => {},
});

export const useTheme = () => useContext(ThemeContext);

// Predefined color palette
export const COLOR_PALETTE = [
  { name: 'Sunset Orange', value: '#EF8354', gradient: 'from-[#EF8354] to-orange-500' },
  { name: 'Ocean Blue', value: '#3B82F6', gradient: 'from-[#3B82F6] to-blue-600' },
  { name: 'Royal Purple', value: '#8B5CF6', gradient: 'from-[#8B5CF6] to-purple-600' },
  { name: 'Emerald Green', value: '#10B981', gradient: 'from-[#10B981] to-green-600' },
  { name: 'Ruby Red', value: '#EF4444', gradient: 'from-[#EF4444] to-red-600' },
  { name: 'Sakura Pink', value: '#EC4899', gradient: 'from-[#EC4899] to-pink-600' },
  { name: 'Golden Yellow', value: '#F59E0B', gradient: 'from-[#F59E0B] to-yellow-600' },
  { name: 'Teal Cyan', value: '#14B8A6', gradient: 'from-[#14B8A6] to-cyan-600' },
  { name: 'Indigo', value: '#6366F1', gradient: 'from-[#6366F1] to-indigo-600' },
  { name: 'Rose', value: '#F43F5E', gradient: 'from-[#F43F5E] to-rose-600' },
  { name: 'Amber', value: '#F97316', gradient: 'from-[#F97316] to-amber-600' },
  { name: 'Lime', value: '#84CC16', gradient: 'from-[#84CC16] to-lime-600' },
];

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [accentColor, setAccentColorState] = useState('#EF8354');
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
  };

  const setAccentColor = (color: string) => {
    setAccentColorState(color);
    localStorage.setItem('pollinations_accent_color', color);
    updateCSSVariables(color);
  };

  if (!mounted) return null;

  return (
    <ThemeContext.Provider value={{ accentColor, setAccentColor }}>
      {children}
    </ThemeContext.Provider>
  );
}
