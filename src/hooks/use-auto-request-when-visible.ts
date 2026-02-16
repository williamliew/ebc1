'use client';

import { useEffect, useRef, type RefObject } from 'react';

const DEFAULT_DELAY_MS = 1500;

/**
 * Runs a callback once when the observed element has been visible for a short delay.
 * Used to gate auto API calls (e.g. blurb/cover) so they only run after the user
 * has had the section in view for 1–2 seconds (reduces spam from quick load-and-leave
 * or background tabs).
 */
export function useAutoRequestWhenVisible(
    elementRef: RefObject<HTMLElement | null>,
    enabled: boolean,
    onReady: () => void,
    options?: { delayMs?: number },
): void {
    const delayMs = options?.delayMs ?? DEFAULT_DELAY_MS;
    const hasFiredRef = useRef(false);

    useEffect(() => {
        if (!enabled) {
            hasFiredRef.current = false;
            return;
        }
        if (hasFiredRef.current) return;
        const el = elementRef.current;
        if (!el) return;

        let timeoutId: ReturnType<typeof setTimeout> | null = null;

        const observer = new IntersectionObserver(
            (entries) => {
                const entry = entries[0];
                if (!entry?.isIntersecting) return;
                observer.disconnect();
                timeoutId = setTimeout(() => {
                    timeoutId = null;
                    if (!hasFiredRef.current) {
                        hasFiredRef.current = true;
                        onReady();
                    }
                }, delayMs);
            },
            { threshold: 0.1, rootMargin: '50px' },
        );

        observer.observe(el);

        return () => {
            observer.disconnect();
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [enabled, elementRef, onReady, delayMs]);
}
