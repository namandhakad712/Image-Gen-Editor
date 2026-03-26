'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Moon, Sun, Monitor, Check } from 'lucide-react';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeToggleProps {
    className?: string;
}

const THEME_STORAGE_KEY = 'pollinations_theme_mode';

export function ThemeToggle({ className = '' }: ThemeToggleProps) {
    const [themeMode, setThemeMode] = useState<ThemeMode>('system');
    const [mounted, setMounted] = useState(false);

    // Initialize theme from storage
    useEffect(() => {
        const saved = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
        if (saved && ['light', 'dark', 'system'].includes(saved)) {
            setThemeMode(saved);
        }
        setMounted(true);
    }, []);

    // Apply theme to document
    useEffect(() => {
        if (!mounted) return;

        const root = document.documentElement;

        if (themeMode === 'dark') {
            root.classList.add('dark');
        } else if (themeMode === 'light') {
            root.classList.remove('dark');
        } else {
            // System preference
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (prefersDark) {
                root.classList.add('dark');
            } else {
                root.classList.remove('dark');
            }
        }

        localStorage.setItem(THEME_STORAGE_KEY, themeMode);
    }, [themeMode, mounted]);

    // Listen for system theme changes
    useEffect(() => {
        if (themeMode !== 'system') return;

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handler = (e: MediaQueryListEvent) => {
            const root = document.documentElement;
            if (e.matches) {
                root.classList.add('dark');
            } else {
                root.classList.remove('dark');
            }
        };

        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
    }, [themeMode]);

    if (!mounted) {
        return <div className={`w-20 h-10 bg-zinc-200 rounded-full animate-pulse ${className}`} />;
    }

    const modes: { value: ThemeMode; icon: React.ReactNode; label: string }[] = [
        { value: 'light', icon: <Sun size={14} />, label: 'Light' },
        { value: 'dark', icon: <Moon size={14} />, label: 'Dark' },
        { value: 'system', icon: <Monitor size={14} />, label: 'System' },
    ];

    return (
        <div className={`flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-full ${className}`}>
            {modes.map((mode) => (
                <button
                    key={mode.value}
                    onClick={() => setThemeMode(mode.value)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${themeMode === mode.value
                            ? 'bg-white dark:bg-zinc-700 text-[var(--accent-color)] shadow-sm'
                            : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
                        }`}
                    title={`Switch to ${mode.label} mode`}
                >
                    {mode.icon}
                    <span className="hidden sm:inline">{mode.label}</span>
                    {themeMode === mode.value && (
                        <Check size={12} className="ml-0.5" />
                    )}
                </button>
            ))}
        </div>
    );
}

// Hook for using theme in components
export function useThemeMode() {
    const [themeMode, setThemeMode] = useState<ThemeMode>('system');
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
        if (saved && ['light', 'dark', 'system'].includes(saved)) {
            setThemeMode(saved);
        }
    }, []);

    useEffect(() => {
        const root = document.documentElement;

        const checkDark = () => {
            if (themeMode === 'dark') {
                setIsDark(true);
            } else if (themeMode === 'light') {
                setIsDark(false);
            } else {
                setIsDark(window.matchMedia('(prefers-color-scheme: dark)').matches);
            }
        };

        checkDark();

        if (themeMode === 'system') {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
            mediaQuery.addEventListener('change', handler);
            return () => mediaQuery.removeEventListener('change', handler);
        }
    }, [themeMode]);

    const setMode = useCallback((mode: ThemeMode) => {
        setThemeMode(mode);
        localStorage.setItem(THEME_STORAGE_KEY, mode);
    }, []);

    const toggleDark = useCallback(() => {
        setMode(isDark ? 'light' : 'dark');
    }, [isDark, setMode]);

    return { themeMode, isDark, setMode, toggleDark };
}

export default ThemeToggle;

