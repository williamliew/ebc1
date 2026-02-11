'use client';

/**
 * Small bouncing-dots loading indicator. Use in modals or inline where the book flip would be too much.
 */
export function LoadingDots({ className = '' }: { className?: string }) {
    return (
        <div
            className={`flex items-center justify-center gap-0.5 ${className}`}
            role="status"
            aria-label="Loading"
        >
            <span
                className="w-1.5 h-1.5 rounded-full bg-current opacity-70 animate-bounce"
                style={{ animationDelay: '0ms', animationDuration: '0.6s' }}
            />
            <span
                className="w-1.5 h-1.5 rounded-full bg-current opacity-70 animate-bounce"
                style={{ animationDelay: '150ms', animationDuration: '0.6s' }}
            />
            <span
                className="w-1.5 h-1.5 rounded-full bg-current opacity-70 animate-bounce"
                style={{ animationDelay: '300ms', animationDuration: '0.6s' }}
            />
        </div>
    );
}
