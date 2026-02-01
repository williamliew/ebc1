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

function AccessibilityIcon({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className={className}
            aria-hidden
        >
            {/* Universal access: figure in circle */}
            <path d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20Zm0 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm0 3a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm0 5.5.75 4.5h-1.5L11 12.5h2l-.75 4.5h-1.5L12 12.5Zm-2.5-2 .5-2 1 1.5-1.5.5Zm5 0-1.5.5 1-1.5.5 2Z" />
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
