'use client';

import React from 'react';
import { useTheme } from '@/lib/theme';

/**
 * ThemeColorText - Text component with dynamic accent color
 */
export function ThemeColorText({ children, className = '', ...props }: React.HTMLAttributes<HTMLElement>) {
  const { accentColor } = useTheme();
  return (
    <span style={{ color: accentColor }} className={className} {...props}>
      {children}
    </span>
  );
}

/**
 * ThemeColorBg - Background component with dynamic accent color
 */
export function ThemeColorBg({ children, className = '', opacity = 100, ...props }: React.HTMLAttributes<HTMLElement> & { opacity?: number }) {
  const { accentColor } = useTheme();
  const bgValue = opacity < 100 ? `${accentColor}${Math.round(opacity * 2.55).toString(16).padStart(2, '0')}` : accentColor;
  return (
    <div style={{ backgroundColor: bgValue }} className={className} {...props}>
      {children}
    </div>
  );
}

/**
 * ThemeColorBorder - Border component with dynamic accent color
 */
export function ThemeColorBorder({ children, className = '', opacity = 100, ...props }: React.HTMLAttributes<HTMLElement> & { opacity?: number }) {
  const { accentColor } = useTheme();
  const borderColor = opacity < 100 ? `${accentColor}${Math.round(opacity * 2.55).toString(16).padStart(2, '0')}` : accentColor;
  return (
    <div style={{ borderColor }} className={className} {...props}>
      {children}
    </div>
  );
}

/**
 * ThemeColorRing - Ring/shadow component with dynamic accent color
 */
export function ThemeColorRing({ children, className = '', opacity = 30, ...props }: React.HTMLAttributes<HTMLElement> & { opacity?: number }) {
  const { accentColor } = useTheme();
  const shadowColor = opacity < 100 ? `${accentColor}${Math.round(opacity * 2.55).toString(16).padStart(2, '0')}` : accentColor;
  return (
    <div 
      style={{ 
        boxShadow: `0 4px 14px ${shadowColor}`,
        ringColor: accentColor 
      }} 
      className={className} 
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * Hook to get accent color for inline styles
 */
export function useAccentColor() {
  const { accentColor } = useTheme();
  return {
    color: accentColor,
    bg: (opacity?: number) => opacity ? `${accentColor}${Math.round(opacity * 2.55).toString(16).padStart(2, '0')}` : accentColor,
    border: (opacity?: number) => opacity ? `${accentColor}${Math.round(opacity * 2.55).toString(16).padStart(2, '0')}` : accentColor,
    shadow: (opacity = 30) => `${accentColor}${Math.round(opacity * 2.55).toString(16).padStart(2, '0')}`,
  };
}
