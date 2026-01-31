'use client';

import Link from 'next/link';
import { useState, useCallback } from 'react';

function PenWritingIcon({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            aria-hidden
        >
            {/* Pen / pencil writing (nib + body) */}
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
        </svg>
    );
}

export function AdminPanel({
    showAdmin,
    isLocal,
}: {
    showAdmin: boolean;
    isLocal: boolean;
}) {
    const [open, setOpen] = useState(false);
    const showButton = showAdmin || isLocal;

    const close = useCallback(() => setOpen(false), []);
    const toggle = useCallback(() => setOpen((prev) => !prev), []);

    if (!showButton) return null;

    return (
        <>
            <button
                type="button"
                onClick={toggle}
                className="fixed left-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900 shadow-md hover:bg-zinc-700 dark:hover:bg-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-950 transition-colors"
                aria-label="Open admin panel"
                aria-expanded={open}
            >
                <PenWritingIcon className="h-5 w-5" />
            </button>

            {/* Backdrop */}
            {open && (
                <button
                    type="button"
                    onClick={close}
                    className="fixed inset-0 z-30 bg-black/40 backdrop-blur-[2px] transition-opacity"
                    aria-label="Close admin panel"
                />
            )}

            {/* Sliding panel */}
            <aside
                className="fixed left-0 top-0 z-40 h-full w-[280px] max-w-[85vw] border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xl transition-transform duration-300 ease-out"
                style={{
                    transform: open ? 'translateX(0)' : 'translateX(-100%)',
                }}
                {...(open ? {} : { inert: true })}
            >
                <div className="flex h-full flex-col p-4 pt-14">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                            Admin actions
                        </h2>
                        <button
                            type="button"
                            onClick={close}
                            className="rounded p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600"
                            aria-label="Close panel"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="h-5 w-5"
                            >
                                <path d="M18 6L6 18M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    <nav className="flex flex-col gap-2">
                        <Link
                            href="/admin/voting-builder"
                            onClick={close}
                            className="inline-flex items-center justify-center rounded-lg bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900 px-4 py-2.5 text-sm font-medium hover:bg-zinc-700 dark:hover:bg-zinc-300 transition-colors"
                        >
                            Voting page builder
                        </Link>
                        <Link
                            href="/admin/question-builder"
                            onClick={close}
                            className="inline-flex items-center justify-center rounded-lg bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900 px-4 py-2.5 text-sm font-medium hover:bg-zinc-700 dark:hover:bg-zinc-300 transition-colors"
                        >
                            Question builder
                        </Link>
                    </nav>
                </div>
            </aside>
        </>
    );
}
