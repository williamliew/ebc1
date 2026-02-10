'use client';

import Link from 'next/link';
import { useState, useCallback } from 'react';
import { SignOutIcon } from '@/components/sign-out-icon';

function PenWritingIcon({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="white"
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
                className="fixed left-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-md hover:bg-[var(--primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 focus:ring-offset-[var(--background)] transition-colors"
                aria-label="Open manage club"
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
                    aria-label="Close manage club"
                />
            )}

            {/* Sliding panel */}
            <aside
                className="fixed left-0 top-0 z-40 h-full w-[280px] max-w-[85vw] border-r border-border bg-surface shadow-xl transition-transform duration-300 ease-out"
                style={{
                    transform: open ? 'translateX(0)' : 'translateX(-100%)',
                }}
                {...(open ? {} : { inert: true })}
            >
                <div className="flex h-full flex-col p-4 pt-14">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-heading text-lg font-semibold text-foreground">
                            Manage club
                        </h2>
                        <button
                            type="button"
                            onClick={close}
                            className="rounded p-1.5 text-muted hover:bg-[var(--surface-hover)] hover:text-foreground focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
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
                            href="/admin/create-a-vote"
                            onClick={close}
                            className="inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium hover:bg-[var(--primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 focus:ring-offset-[var(--background)] transition-colors"
                        >
                            Create a vote
                        </Link>
                        <Link
                            href="/admin/open-suggestions"
                            onClick={close}
                            className="inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium hover:bg-[var(--primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 focus:ring-offset-[var(--background)] transition-colors"
                        >
                            Open book suggestions
                        </Link>
                        <Link
                            href="/admin/bookofthemonth"
                            onClick={close}
                            className="inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium hover:bg-[var(--primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 focus:ring-offset-[var(--background)] transition-colors"
                        >
                            Set book of the month
                        </Link>
                        <Link
                            href="/admin/create-eventbrite-event"
                            onClick={close}
                            className="inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium hover:bg-[var(--primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 focus:ring-offset-[var(--background)] transition-colors"
                        >
                            Create event on Eventbrite
                        </Link>
                        <Link
                            href="/admin/book-of-the-month-graphic"
                            onClick={close}
                            className="inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium hover:bg-[var(--primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 focus:ring-offset-[var(--background)] transition-colors"
                        >
                            Book of the month graphic
                        </Link>
                        <Link
                            href="/admin/vote-results"
                            onClick={close}
                            className="inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium hover:bg-[var(--primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 focus:ring-offset-[var(--background)] transition-colors"
                        >
                            Vote results
                        </Link>
                        <Link
                            href="/admin/view-suggestions"
                            onClick={close}
                            className="inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium hover:bg-[var(--primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 focus:ring-offset-[var(--background)] transition-colors"
                        >
                            View suggestions
                        </Link>
                    </nav>
                    <div className="mt-auto pt-4 border-t border-border">
                        <Link
                            href="/api/admin/logout"
                            prefetch={false}
                            className="flex items-center justify-center gap-1.5 text-sm text-muted underline hover:no-underline hover:text-foreground py-2"
                        >
                            Sign out
                            <SignOutIcon className="size-4 shrink-0" />
                        </Link>
                    </div>
                </div>
            </aside>
        </>
    );
}
