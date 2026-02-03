'use client';

import { useState } from 'react';
import Link from 'next/link';

function getDefaultOpenForDate(): string {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function getDefaultCloseDate(): string {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

export default function OpenSuggestionsPage() {
    const [suggestionsForDate, setSuggestionsForDate] = useState(
        getDefaultOpenForDate,
    );
    const [closeDate, setCloseDate] = useState(getDefaultCloseDate);
    const [accessPassword, setAccessPassword] = useState('');
    const [status, setStatus] = useState<
        'idle' | 'pending' | 'success' | 'error'
    >('idle');
    const [message, setMessage] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('pending');
        setMessage(null);
        try {
            const closeAt = new Date(closeDate + 'T23:59:59');
            const res = await fetch('/api/suggestion-rounds', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    suggestionsForDate,
                    closeAt: closeAt.toISOString(),
                    suggestionAccessPassword:
                        accessPassword.trim() || undefined,
                }),
                credentials: 'include',
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(
                    data.error ?? 'Failed to create suggestion round',
                );
            }
            setStatus('success');
            setMessage(
                'Suggestions round created. Members can now suggest books at /suggestnextbook.',
            );
            setSuggestionsForDate(getDefaultOpenForDate());
            setCloseDate(getDefaultCloseDate());
            setAccessPassword('');
        } catch (err) {
            setStatus('error');
            setMessage(
                err instanceof Error ? err.message : 'Something went wrong',
            );
        }
    };

    return (
        <div className="min-h-screen bg-background text-foreground">
            <header className="border-b border-border bg-surface px-4 py-4">
                <Link
                    href="/"
                    className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground mb-2"
                >
                    ← Back to home
                </Link>
                <h1 className="text-xl font-semibold">Open book suggestions</h1>
                <p className="text-sm text-muted mt-1">
                    Open the floor for members to suggest the next month&apos;s
                    book. Set dates and an optional access password.
                </p>
            </header>

            <main className="max-w-md mx-auto p-4">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label
                            htmlFor="suggestions-for"
                            className="block text-sm font-medium mb-1"
                        >
                            Open suggestions for
                        </label>
                        <input
                            id="suggestions-for"
                            type="date"
                            value={suggestionsForDate}
                            onChange={(e) =>
                                setSuggestionsForDate(e.target.value)
                            }
                            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                            required
                        />
                    </div>
                    <div>
                        <label
                            htmlFor="close-date"
                            className="block text-sm font-medium mb-1"
                        >
                            Close suggestions
                        </label>
                        <input
                            id="close-date"
                            type="date"
                            value={closeDate}
                            onChange={(e) => setCloseDate(e.target.value)}
                            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                            required
                        />
                    </div>
                    <div>
                        <label
                            htmlFor="access-password"
                            className="block text-sm font-medium mb-1"
                        >
                            Access password (optional)
                        </label>
                        <input
                            id="access-password"
                            type="password"
                            value={accessPassword}
                            onChange={(e) => setAccessPassword(e.target.value)}
                            placeholder="Leave blank for no password"
                            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                            autoComplete="off"
                        />
                        <p className="text-xs text-muted mt-1">
                            If set, visitors must enter this password to view
                            and suggest on the Suggest next book page.
                        </p>
                    </div>
                    {message && (
                        <p
                            role="alert"
                            className={`text-sm ${status === 'error' ? 'text-red-600 dark:text-red-400' : 'text-foreground'}`}
                        >
                            {message}
                        </p>
                    )}
                    <button
                        type="submit"
                        disabled={status === 'pending'}
                        className="w-full rounded-lg bg-primary text-primary-foreground px-4 py-3 text-sm font-medium hover:bg-[var(--primary-hover)] disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 focus:ring-offset-[var(--background)]"
                    >
                        {status === 'pending'
                            ? 'Creating…'
                            : 'Open suggestions'}
                    </button>
                </form>
            </main>
        </div>
    );
}
