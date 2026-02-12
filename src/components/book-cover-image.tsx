'use client';

import Image from 'next/image';
import { useState, useRef, useEffect } from 'react';

/** Tiny grey blur placeholder for image load (reduces layout shift) */
const BLUR_DATA =
    'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxIiBoZWlnaHQ9IjEiPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9IiNlNWU3ZWIiLz48L3N2Zz4=';

function BouncingDots({ className }: { className?: string }) {
    return (
        <div
            className={`flex items-center justify-center gap-0.5 ${className ?? ''}`}
            aria-hidden
        >
            <span
                className="w-1 h-1 rounded-full bg-current opacity-70 animate-bounce"
                style={{ animationDelay: '0ms', animationDuration: '0.6s' }}
            />
            <span
                className="w-1 h-1 rounded-full bg-current opacity-70 animate-bounce"
                style={{ animationDelay: '150ms', animationDuration: '0.6s' }}
            />
            <span
                className="w-1 h-1 rounded-full bg-current opacity-70 animate-bounce"
                style={{ animationDelay: '300ms', animationDuration: '0.6s' }}
            />
        </div>
    );
}

function NoCoverPlaceholder({ className }: { className?: string }) {
    return (
        <div
            className={`flex flex-col items-center justify-center gap-1 bg-[var(--border)] text-muted text-center ${className ?? ''}`}
            aria-hidden
        >
            <svg
                className="w-8 h-8 shrink-0 opacity-60"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
            </svg>
            <span className="text-xs font-medium">No cover</span>
        </div>
    );
}

export function BookCoverImage({
    src,
    alt = '',
    sizes,
    containerClassName,
    priority = false,
    onError,
    objectFit = 'cover',
    objectPosition = 'center',
}: {
    src: string | null | undefined;
    alt?: string;
    sizes?: string;
    containerClassName: string;
    priority?: boolean;
    /** Called when the image fails to load (e.g. 404). Still shows No cover placeholder. */
    onError?: () => void;
    /** e.g. 'cover' | 'contain'. Default 'cover'. */
    objectFit?: 'cover' | 'contain';
    /** e.g. 'center' | 'top'. Default 'center'. */
    objectPosition?: string;
}) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const imgRef = useRef<HTMLImageElement | null>(null);

    const handleError = () => {
        setError(true);
        setLoading(false);
        onError?.();
    };

    // Cached or already-loaded images may not fire onLoad; check complete and listen for load
    useEffect(() => {
        if (!src) return;
        const id = requestAnimationFrame(() => setLoading(true));
        const checkAndListen = (img: HTMLImageElement | null) => {
            if (!img) return () => {};
            if (img.complete) {
                setLoading(false);
                return () => {};
            }
            const onImgLoad = () => setLoading(false);
            img.addEventListener('load', onImgLoad);
            return () => img.removeEventListener('load', onImgLoad);
        };
        let cleanup = checkAndListen(imgRef.current);
        const t = setTimeout(() => {
            cleanup();
            cleanup = checkAndListen(imgRef.current);
        }, 50);
        return () => {
            cancelAnimationFrame(id);
            clearTimeout(t);
            cleanup();
        };
    }, [src]);

    if (!src || error) {
        return (
            <div className={containerClassName}>
                <div className="relative h-full w-full overflow-hidden rounded">
                    <NoCoverPlaceholder className="absolute inset-0 rounded overflow-hidden" />
                </div>
            </div>
        );
    }

    return (
        <div className={containerClassName}>
            {/* Inner wrapper: has explicit size (w-full h-full) and position relative so Image fill has a non-zero parent */}
            <div className="relative h-full w-full overflow-hidden rounded">
                {loading && (
                    <div
                        className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--border)] text-foreground/60"
                        aria-hidden
                    >
                        <BouncingDots />
                    </div>
                )}
                <Image
                    ref={imgRef}
                    src={src}
                    alt={alt}
                    fill
                    className={objectFit === 'contain' ? 'object-contain' : 'object-cover'}
                    style={{ objectPosition }}
                    unoptimized
                    sizes={sizes ?? '200px'}
                    priority={priority}
                    placeholder="blur"
                    blurDataURL={BLUR_DATA}
                    onLoad={() => setLoading(false)}
                    onError={handleError}
                />
            </div>
        </div>
    );
}
