'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

export type ThemeId = 'default' | 'high-contrast' | 'alternative';

const THEME_STORAGE_KEY = 'ebc-theme';
const THEMES: { id: ThemeId; label: string }[] = [
    { id: 'default', label: 'Default' },
    { id: 'high-contrast', label: 'High contrast' },
    { id: 'alternative', label: 'Alternative' },
];

function getStoredTheme(): ThemeId {
    if (typeof window === 'undefined') return 'default';
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'high-contrast' || stored === 'alternative') return stored;
    return 'default';
}

function applyTheme(theme: ThemeId) {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('data-theme', theme);
}

/** Industry-standard universal access icon: person with round head, torso, outstretched arms and spread legs. */
function AccessibilityIcon({ className }: { className?: string }) {
    return (
        <svg
            fill="currentColor"
            width="20"
            height="20"
            viewBox="-1 0 14 14"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            <path d="M5.90040404,10.0156183 L5.57640804,13.1030489 C5.51867857,13.653166 5.02661696,14.0522519 4.47735768,13.9944323 C3.92809841,13.9366127 3.52963478,13.4437825 3.58736425,12.8936654 L4.30980443,6.00937098 L1,6.00937098 C0.44771525,6.00937098 0,5.56095647 0,5.00780915 C0,4.45466182 0.44771525,4.00624732 1,4.00624732 L11,4.00624732 C11.5522847,4.00624732 12,4.45466182 12,5.00780915 C12,5.56095647 11.5522847,6.00937098 11,6.00937098 L7.69019557,6.00937098 L8.41263575,12.8936654 C8.47036522,13.4437825 8.07190159,13.9366127 7.52264232,13.9944323 C6.97338304,14.0522519 6.48132143,13.653166 6.42359196,13.1030489 L6.09959596,10.0156183 L5.90040404,10.0156183 Z M6,4.00624732 C4.8954305,4.00624732 4,3.10941831 4,2.00312366 C4,0.89682901 4.8954305,0 6,0 C7.1045695,0 8,0.89682901 8,2.00312366 C8,3.10941831 7.1045695,4.00624732 6,4.00624732 Z" />
        </svg>
    );
}

export function AccessibilityThemeSwitcher() {
    const [open, setOpen] = useState(false);
    const [theme, setTheme] = useState<ThemeId>('default');
    const panelRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    const close = useCallback(() => setOpen(false), []);
    const toggle = useCallback(() => setOpen((prev) => !prev), []);

    useEffect(() => {
        const stored = getStoredTheme();
        setTheme(stored);
        applyTheme(stored);
    }, []);

    useEffect(() => {
        if (!open) return;
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as Node;
            if (
                panelRef.current?.contains(target) ||
                buttonRef.current?.contains(target)
            )
                return;
            close();
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () =>
            document.removeEventListener('mousedown', handleClickOutside);
    }, [open, close]);

    const selectTheme = useCallback(
        (id: ThemeId) => {
            setTheme(id);
            if (typeof window !== 'undefined') {
                window.localStorage.setItem(THEME_STORAGE_KEY, id);
            }
            applyTheme(id);
            close();
        },
        [close],
    );

    return (
        <div className="fixed right-4 top-4 z-20 flex flex-col items-end">
            <button
                ref={buttonRef}
                type="button"
                onClick={toggle}
                className="flex h-10 w-10 items-center justify-center rounded-lg border-2 border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] shadow-md transition-[background-color,color] hover:bg-[var(--surface-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 focus:ring-offset-[var(--background)]"
                style={{
                    boxShadow: open ? '0 0 0 2px var(--primary)' : undefined,
                }}
                aria-label="Accessibility options"
                aria-expanded={open}
                aria-haspopup="true"
            >
                <AccessibilityIcon className="h-5 w-5" />
            </button>

            {open && (
                <div
                    ref={panelRef}
                    className="mt-2 flex flex-col rounded-lg border-2 border-[var(--border)] bg-[var(--surface)] py-2 shadow-lg"
                    role="menu"
                    aria-label="Theme options"
                >
                    {THEMES.map(({ id, label }) => (
                        <button
                            key={id}
                            type="button"
                            role="menuitemradio"
                            aria-checked={theme === id}
                            onClick={() => selectTheme(id)}
                            className="min-w-[160px] px-4 py-2.5 text-left text-sm transition-colors hover:bg-[var(--surface-hover)] focus:bg-[var(--surface-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-inset"
                            style={{
                                backgroundColor:
                                    theme === id
                                        ? 'var(--surface-hover)'
                                        : undefined,
                                fontWeight: theme === id ? 600 : 400,
                            }}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
