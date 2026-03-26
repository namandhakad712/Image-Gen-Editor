'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { LayoutGrid, Settings, Wand2, History, Video, BarChart3, Images, X } from 'lucide-react';

interface NavItem {
    href: string;
    icon: React.ReactNode;
    label: string;
    isActive?: boolean;
}

interface NavigationMenuProps {
    currentPath?: string;
    showGallery?: boolean;
}

const NAV_ITEMS: NavItem[] = [
    { href: '/', icon: <Wand2 size={16} />, label: 'Image Generation' },
    { href: '/history', icon: <History size={16} />, label: 'My Generations' },
    { href: '/video', icon: <Video size={16} />, label: 'Video Generation' },
    { href: '/usage', icon: <BarChart3 size={16} />, label: 'Usage Dashboard' },
    { href: '/settings', icon: <Settings size={16} />, label: 'Settings' },
    { href: '/gallery', icon: <Images size={16} />, label: 'Community Gallery', isActive: false },
];

export function NavigationMenu({ currentPath = '/', showGallery = false }: NavigationMenuProps) {
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Filter items based on showGallery prop
    const displayItems = showGallery
        ? NAV_ITEMS
        : NAV_ITEMS.filter(item => item.href !== '/gallery');

    // Determine active state
    const isActive = (href: string) => {
        if (href === '/') return currentPath === '/';
        return currentPath.startsWith(href);
    };

    // Get accent color from CSS custom property
    const [accentColor] = useState(() => {
        if (typeof window !== 'undefined') {
            const computedStyle = getComputedStyle(document.documentElement);
            return computedStyle.getPropertyValue('--accent-color').trim() || 'var(--accent-color)';
        }
        return 'var(--accent-color)';
    });

    return (
        <>
            <div className="fixed top-4 left-4 md:top-6 md:left-6 z-50 flex items-center gap-2">
                <div className="glass-pill rounded-full flex items-center p-1.5 pr-4 shadow-sm relative" ref={menuRef}>
                    <button
                        onClick={() => setMenuOpen(!menuOpen)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors font-medium text-sm ${menuOpen ? 'bg-[var(--accent-color)]/10 text-[var(--accent-color)]' : 'text-zinc-700 hover:bg-black/5'}`}
                    >
                        <LayoutGrid size={16} />
                        <span className="hidden sm:inline">Menu</span>
                    </button>
                    <div className="w-px h-4 bg-zinc-200 mx-2"></div>
                    <button
                        onClick={() => window.location.href = '/settings'}
                        className="p-1.5 rounded-full text-zinc-500 hover:bg-black/5 transition-colors"
                    >
                        <Settings size={16} />
                    </button>

                    {menuOpen && (
                        <div className="absolute top-full left-0 mt-2 w-56 glass-panel rounded-2xl p-2 shadow-xl animate-slide-down z-[60]">
                            {displayItems.map((item) => (
                                <a
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setMenuOpen(false)}
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${isActive(item.href)
                                            ? 'text-[var(--accent-color)] bg-[var(--accent-color)]/5'
                                            : 'text-zinc-700 hover:bg-black/5'
                                        }`}
                                >
                                    {item.icon}
                                    {item.label}
                                </a>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            {menuOpen && <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />}
        </>
    );
}

// Compact version for inner pages
export function CompactNavigation({ currentPath = '/' }: { currentPath?: string }) {
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const isActive = (href: string) => {
        if (href === '/') return currentPath === '/';
        return currentPath.startsWith(href);
    };

    const items: NavItem[] = [
        { href: '/', icon: <Wand2 size={16} />, label: 'Image Generation' },
        { href: '/history', icon: <History size={16} />, label: 'My Generations' },
        { href: '/video', icon: <Video size={16} />, label: 'Video Generation' },
        { href: '/usage', icon: <BarChart3 size={16} />, label: 'Usage Dashboard' },
        { href: '/settings', icon: <Settings size={16} />, label: 'Settings' },
    ];

    return (
        <>
            <div className="fixed top-4 left-4 md:top-6 md:left-6 z-50 flex items-center gap-2">
                <div className="glass-pill rounded-full flex items-center p-1.5 pr-4 shadow-sm relative">
                    <button
                        onClick={() => setMenuOpen(!menuOpen)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors font-medium text-sm ${menuOpen ? 'bg-[var(--accent-color)]/10 text-[var(--accent-color)]' : 'text-zinc-700 hover:bg-black/5'}`}
                    >
                        <LayoutGrid size={16} />
                        <span className="hidden sm:inline">Gallery</span>
                    </button>
                    <div className="w-px h-4 bg-zinc-200 mx-2"></div>
                    <button
                        onClick={() => window.location.href = '/settings'}
                        className="p-1.5 rounded-full text-zinc-500 hover:bg-black/5 transition-colors"
                    >
                        <Settings size={16} />
                    </button>

                    {menuOpen && (
                        <div className="absolute top-full left-0 mt-2 w-56 glass-panel rounded-2xl p-2 shadow-xl animate-slide-down z-[60]" ref={menuRef}>
                            {items.map((item) => (
                                <a
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setMenuOpen(false)}
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${isActive(item.href)
                                            ? 'text-[var(--accent-color)] bg-[var(--accent-color)]/5'
                                            : 'text-zinc-700 hover:bg-black/5'
                                        }`}
                                >
                                    {item.icon}
                                    {item.label}
                                </a>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            {menuOpen && <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />}
        </>
    );
}

export default NavigationMenu;

