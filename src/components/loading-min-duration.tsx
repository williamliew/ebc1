'use client';

import { useEffect, useRef, useState } from 'react';
import { LoadingBookFlip } from '@/components/loading-book-flip';

const DEFAULT_MIN_MS = 1000;
const DEFAULT_FADE_MS = 400;

type Phase = 'loading' | 'fading' | 'done';

/**
 * Shows LoadingBookFlip while isLoading. When loading finishes, keeps the
 * loader visible for at least minMs, then fades out over fadeMs before showing children.
 */
export function LoadingMinDuration({
    isLoading,
    minMs = DEFAULT_MIN_MS,
    fadeMs = DEFAULT_FADE_MS,
    children,
    /** Wrapper class for the full-page loader (e.g. min-h-screen flex items-center justify-center p-6) */
    loaderWrapperClassName = 'min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6',
    size = 'default',
}: {
    isLoading: boolean;
    minMs?: number;
    fadeMs?: number;
    children: React.ReactNode;
    loaderWrapperClassName?: string;
    size?: 'default' | 'sm';
}) {
    const [phase, setPhase] = useState<Phase>(isLoading ? 'loading' : 'done');
    const [fadeOpacity, setFadeOpacity] = useState(1);
    const loadStartRef = useRef<number>(0);
    const timeoutRefs = useRef<ReturnType<typeof setTimeout>[]>([]);

    useEffect(() => {
        if (isLoading) {
            loadStartRef.current = Date.now();
            timeoutRefs.current.forEach(clearTimeout);
            timeoutRefs.current = [];
            const id = setTimeout(() => {
                setPhase('loading');
                setFadeOpacity(1);
            }, 0);
            return () => clearTimeout(id);
        }

        // Loading just finished: enforce minimum time, then fade, then show content
        const elapsed = Date.now() - loadStartRef.current;
        const waitLeft = Math.max(0, minMs - elapsed);

        const id1 = setTimeout(() => {
            setPhase('fading');
            setFadeOpacity(1);
        }, waitLeft);

        const id2 = setTimeout(() => {
            setPhase('done');
            timeoutRefs.current = [];
        }, waitLeft + fadeMs);

        timeoutRefs.current = [id1, id2];
        return () => {
            clearTimeout(id1);
            clearTimeout(id2);
        };
    }, [isLoading, minMs, fadeMs]);

    // When entering 'fading', trigger opacity 0 after paint so the transition runs
    useEffect(() => {
        if (phase !== 'fading') return;
        const raf = requestAnimationFrame(() => {
            requestAnimationFrame(() => setFadeOpacity(0));
        });
        return () => cancelAnimationFrame(raf);
    }, [phase]);

    if (phase === 'done') {
        return <>{children}</>;
    }

    return (
        <div
            className={loaderWrapperClassName}
            style={
                phase === 'fading'
                    ? {
                          transition: `opacity ${fadeMs}ms ease-out`,
                          opacity: fadeOpacity,
                      }
                    : undefined
            }
            aria-hidden={phase === 'fading'}
        >
            <LoadingBookFlip size={size} />
        </div>
    );
}
