// GSAP Animation Utilities for Professional Micro-Interactions
'use client';

import { useEffect, useRef, useCallback } from 'react';
import gsap from 'gsap';

// =============================================
// HOOKS
// =============================================

/**
 * Hook for element entrance animations
 */
export function useGsapEnter(options?: {
    delay?: number;
    duration?: number;
    ease?: string;
    y?: number;
    x?: number;
    scale?: number;
    opacity?: number;
}) {
    const ref = useRef<HTMLElement>(null);

    useEffect(() => {
        if (!ref.current) return;

        const el = ref.current;
        const opts = {
            delay: options?.delay || 0,
            duration: options?.duration || 0.6,
            ease: options?.ease || 'power3.out',
            y: options?.y || 30,
            x: options?.x || 0,
            scale: options?.scale || 0.95,
            opacity: options?.opacity || 0,
        };

        gsap.fromTo(el,
            { opacity: opts.opacity, y: opts.y, x: opts.x, scale: opts.scale },
            { opacity: 1, y: 0, x: 0, scale: 1, duration: opts.duration, delay: opts.delay, ease: opts.ease }
        );
    }, [options]);

    return ref;
}

/**
 * Hook for staggered list animations
 */
export function useStaggeredEnter(options?: {
    delay?: number;
    duration?: number;
    stagger?: number;
    ease?: string;
}) {
    const ref = useRef<HTMLElement>(null);

    useEffect(() => {
        if (!ref.current) return;

        const children = ref.current.children;
        if (children.length === 0) return;

        const opts = {
            delay: options?.delay || 0.1,
            duration: options?.duration || 0.5,
            stagger: options?.stagger || 0.08,
            ease: options?.ease || 'power2.out',
        };

        gsap.fromTo(children,
            { opacity: 0, y: 20, scale: 0.9 },
            {
                opacity: 1,
                y: 0,
                scale: 1,
                duration: opts.duration,
                stagger: opts.stagger,
                delay: opts.delay,
                ease: opts.ease,
                overwrite: 'auto'
            }
        );
    }, [options]);

    return ref;
}

/**
 * Hook for hover scale effect
 */
export function useHoverScale(scale: number = 1.05) {
    const ref = useRef<HTMLElement>(null);

    useEffect(() => {
        if (!ref.current) return;

        const el = ref.current;

        const onEnter = () => {
            gsap.to(el, { scale, duration: 0.3, ease: 'power2.out' });
        };

        const onLeave = () => {
            gsap.to(el, { scale: 1, duration: 0.3, ease: 'power2.out' });
        };

        el.addEventListener('mouseenter', onEnter);
        el.addEventListener('mouseleave', onLeave);

        return () => {
            el.removeEventListener('mouseenter', onEnter);
            el.removeEventListener('mouseleave', onLeave);
        };
    }, [scale]);

    return ref;
}

/**
 * Hook for shimmer loading effect
 */
export function useShimmer() {
    const ref = useRef<HTMLElement>(null);

    useEffect(() => {
        if (!ref.current) return;

        const el = ref.current;

        gsap.fromTo(el,
            { backgroundPosition: '-200% 0' },
            {
                backgroundPosition: '200% 0',
                duration: 1.5,
                repeat: -1,
                ease: 'linear'
            }
        );
    }, []);

    return ref;
}

/**
 * Hook for pulse animation
 */
export function usePulse(scale: number = 1.1, duration: number = 0.8) {
    const ref = useRef<HTMLElement>(null);

    useEffect(() => {
        if (!ref.current) return;

        gsap.to(ref.current, {
            scale,
            duration: duration / 2,
            repeat: -1,
            yoyo: true,
            ease: 'power1.inOut',
        });
    }, [scale, duration]);

    return ref;
}

// =============================================
// UTILITY FUNCTIONS
// =============================================

/**
 * Animate page/component entrance
 */
export function animateEntrance(element: HTMLElement, options?: {
    delay?: number;
    duration?: number;
    stagger?: number;
}) {
    return gsap.fromTo(element,
        { opacity: 0, y: 20 },
        {
            opacity: 1,
            y: 0,
            duration: options?.duration || 0.5,
            delay: options?.delay || 0,
            ease: 'power3.out'
        }
    );
}

/**
 * Animate modal open
 */
export function animateModalOpen(element: HTMLElement) {
    const tl = gsap.timeline();

    tl.fromTo(element,
        { opacity: 0, scale: 0.9, y: 20 },
        {
            opacity: 1,
            scale: 1,
            y: 0,
            duration: 0.4,
            ease: 'back.out(1.5)'
        }
    );

    return tl;
}

/**
 * Animate modal close
 */
export function animateModalClose(element: HTMLElement, onComplete?: () => void) {
    const tl = gsap.timeline({ onComplete });

    tl.to(element, {
        opacity: 0,
        scale: 0.95,
        y: 10,
        duration: 0.25,
        ease: 'power2.in',
    });

    return tl;
}

/**
 * Animate button click
 */
export function animateButtonClick(element: HTMLElement) {
    return gsap.to(element, {
        scale: 0.95,
        duration: 0.1,
        ease: 'power2.out',
        yoyo: true,
        repeat: 1,
    });
}

/**
 * Animate list item removal
 */
export function animateListRemove(element: HTMLElement, onComplete?: () => void) {
    return gsap.to(element, {
        opacity: 0,
        x: -50,
        height: 0,
        padding: 0,
        margin: 0,
        duration: 0.3,
        ease: 'power2.in',
        onComplete,
    });
}

/**
 * Animate toast notification
 */
export function animateToastIn(element: HTMLElement) {
    return gsap.fromTo(element,
        { opacity: 0, x: 50, scale: 0.9 },
        {
            opacity: 1,
            x: 0,
            scale: 1,
            duration: 0.4,
            ease: 'back.out(1.5)'
        }
    );
}

export function animateToastOut(element: HTMLElement, onComplete?: () => void) {
    return gsap.to(element, {
        opacity: 0,
        x: 50,
        scale: 0.9,
        duration: 0.3,
        ease: 'power2.in',
        onComplete,
    });
}

/**
 * Animate selection highlight
 */
export function animateSelection(element: HTMLElement, color: string = '#EF8354') {
    return gsap.fromTo(element,
        { boxShadow: `0 0 0 0 ${color}` },
        {
            boxShadow: `0 0 0 4px ${color}40`,
            duration: 0.4,
            ease: 'power2.out'
        }
    );
}

/**
 * Animate loading spinner
 */
export function animateSpinner(element: HTMLElement) {
    return gsap.to(element, {
        rotation: 360,
        duration: 1,
        repeat: -1,
        ease: 'linear',
    });
}

/**
 * Create parallax effect
 */
export function createParallax(element: HTMLElement, speed: number = 0.5) {
    const yMove = gsap.to(element, {
        y: () => speed * 100,
        duration: 1,
        ease: 'none',
        repeat: -1,
        yoyo: true,
    });

    return yMove;
}

/**
 * Animate ripple effect on click
 */
export function createRipple(event: MouseEvent, element: HTMLElement) {
    const rect = element.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const ripple = document.createElement('span');
    ripple.style.cssText = `
    position: absolute;
    width: 0;
    height: 0;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.4);
    transform: translate(-50%, -50%);
    left: ${x}px;
    top: ${y}px;
  `;

    element.appendChild(ripple);

    gsap.to(ripple, {
        width: 200,
        height: 200,
        opacity: 0,
        duration: 0.6,
        ease: 'power2.out',
        onComplete: () => ripple.remove(),
    });
}

// =============================================
// EXPORT GSAP FOR DIRECT USE
// =============================================
export { gsap };