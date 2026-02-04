/**
 * Reusable loading animation (book page flip). Use for any "loading or fetching data" state.
 * Screen readers get role="status" and aria-label="Loading or fetching data"; animation is aria-hidden.
 */

import { EbcLogo } from '@/components/ebc-logo';

const PAGE_TEXT = Array.from({ length: 23 }, (_, i) => (
    <div key={i}>All work and no play makes Jack a dull boy.</div>
));

export function LoadingBookFlip({
    className = '',
    size = 'default',
}: {
    className?: string;
    /** 'default' for full-page/block (140px), 'sm' for inline/smaller (80px) */
    size?: 'default' | 'sm';
}) {
    const isSm = size === 'sm';
    const minHeight = isSm ? 80 : 140;
    const bookClass = isSm
        ? 'demo-book-tilt relative w-20 h-28 flex shrink-0'
        : 'demo-book-tilt relative w-28 h-36 flex shrink-0';

    return (
        <div
            className={className}
            role="status"
            aria-label="Loading or fetching data"
            aria-live="polite"
        >
            <div
                className="demo-perspective flex justify-center items-center"
                style={{ minHeight }}
                aria-hidden
            >
                <div className={bookClass}>
                    {/* Book base: spine + rest */}
                    <div
                        className="absolute inset-0 flex rounded-sm overflow-hidden z-0"
                        style={{
                            boxShadow:
                                '4px 6px 16px rgba(0,0,0,0.14), 2px 3px 8px rgba(0,0,0,0.08)',
                        }}
                        aria-hidden
                    >
                        <div
                            className="w-2.5 shrink-0"
                            style={{
                                background: `linear-gradient(90deg, color-mix(in srgb, var(--primary) 85%, black), color-mix(in srgb, var(--primary) 100%, white 15%))`,
                            }}
                        />
                        <div
                            className="flex-1 overflow-hidden px-1.5 pt-1.5"
                            style={{
                                background: `linear-gradient(90deg, var(--surface-hover) 0%, var(--surface) 20%)`,
                                boxShadow: 'inset 1px 0 0 rgba(0,0,0,0.06)',
                            }}
                        >
                            <div
                                className="text-[0.2rem] leading-[0.36rem] text-foreground/75 font-mono overflow-hidden"
                                style={{
                                    fontFamily: 'ui-monospace, monospace',
                                }}
                                aria-hidden
                            >
                                {PAGE_TEXT}
                            </div>
                        </div>
                    </div>
                    {/* Flipping page */}
                    <div
                        className="absolute left-2.5 right-0 top-0 bottom-0 rounded-r-sm demo-page-flip-single z-10"
                        style={{
                            transformOrigin: 'left center',
                            transformStyle: 'preserve-3d',
                        }}
                        aria-hidden
                    >
                        <div
                            className={`absolute inset-0 rounded-r-sm demo-page-face flex flex-col items-center justify-start pt-[18%] ${isSm ? 'pt-[22%]' : ''}`}
                            style={{
                                backfaceVisibility: 'hidden',
                                backgroundColor: 'var(--surface)',
                                border: 'none',
                                boxShadow:
                                    '3px 0 10px rgba(0,0,0,0.12), 1px 0 3px rgba(0,0,0,0.08)',
                            }}
                        >
                            <div
                                className={`shrink-0 overflow-hidden text-inherit flex items-center justify-center ${isSm ? 'w-7 h-7' : 'w-10 h-10'}`}
                            >
                                <EbcLogo className="block w-full h-full origin-center fill-current scale-110" />
                            </div>
                            <span
                                className={`leading-tight text-center px-1 text-foreground mt-1.5 ${isSm ? 'text-[0.3rem] mt-1' : 'text-[0.4rem]'}`}
                                style={{
                                    fontFamily: 'Courgette, cursive',
                                }}
                            >
                                Elwood Book Club
                            </span>
                        </div>
                        <div
                            className="absolute inset-0 rounded-r-sm demo-page-face demo-page-back overflow-hidden px-1.5 pt-1.5"
                            style={{
                                backfaceVisibility: 'hidden',
                                border: 'none',
                                boxShadow: '-2px 0 8px rgba(0,0,0,0.08)',
                            }}
                        >
                            <div
                                className="text-[0.2rem] leading-[0.36rem] text-foreground/75 font-mono overflow-hidden"
                                style={{
                                    fontFamily: 'ui-monospace, monospace',
                                }}
                                aria-hidden
                            >
                                {PAGE_TEXT}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
