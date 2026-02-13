'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { LoadingBookFlip } from '@/components/loading-book-flip';

const IDLE_MS = 5 * 60 * 1000; // 5 minutes
const ACTIVITY_THROTTLE_MS = 1000;

/**
 * Overlay shown when the user switches tabs (page hidden) or is idle for 5 minutes.
 * Displays LoadingBookFlip and an "I'm back!" button to dismiss.
 * Use on admin pages only.
 */
export function AdminIdleOverlay({ children }: { children: React.ReactNode }) {
    const [showOverlay, setShowOverlay] = useState(false);
    const lastActivityRef = useRef<number>(0);
    useEffect(() => {
        lastActivityRef.current = Date.now();
    }, []);
    const idleCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const throttleRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const dismissOverlay = useCallback(() => {
        setShowOverlay(false);
        lastActivityRef.current = Date.now();
    }, []);

    // Tab visibility: show overlay when tab is hidden
    useEffect(() => {
        const onVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                setShowOverlay(true);
            }
        };
        document.addEventListener('visibilitychange', onVisibilityChange);
        return () =>
            document.removeEventListener(
                'visibilitychange',
                onVisibilityChange,
            );
    }, []);

    // Idle: reset timer on activity (throttled), check periodically for 5 min idle
    useEffect(() => {
        const recordActivity = () => {
            if (throttleRef.current) return;
            throttleRef.current = setTimeout(() => {
                lastActivityRef.current = Date.now();
                throttleRef.current = null;
            }, ACTIVITY_THROTTLE_MS);
        };

        idleCheckRef.current = setInterval(() => {
            if (Date.now() - lastActivityRef.current >= IDLE_MS) {
                setShowOverlay(true);
            }
        }, 15000); // check every 15s to limit work

        const events = [
            'mousemove',
            'keydown',
            'scroll',
            'click',
            'touchstart',
        ];
        events.forEach((e) => document.addEventListener(e, recordActivity));

        return () => {
            if (idleCheckRef.current) clearInterval(idleCheckRef.current);
            if (throttleRef.current) clearTimeout(throttleRef.current);
            events.forEach((e) =>
                document.removeEventListener(e, recordActivity),
            );
        };
    }, []);

    return (
        <>
            {children}
            {showOverlay && (
                <div
                    className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-background/95 text-foreground"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="idle-overlay-title"
                    aria-describedby="idle-overlay-desc"
                >
                    <LoadingBookFlip size="default" />
                    <div className="text-center">
                        <h2
                            id="idle-overlay-title"
                            className="text-lg font-semibold"
                        >
                            Still there?
                        </h2>
                        <p
                            id="idle-overlay-desc"
                            className="mt-1 text-sm text-muted-foreground"
                        >
                            Click below when you&apos;re back.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={dismissOverlay}
                        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    >
                        I&apos;m back!
                    </button>
                </div>
            )}
        </>
    );
}
