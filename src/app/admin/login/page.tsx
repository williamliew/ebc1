'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { BackArrowIcon } from '@/components/back-arrow-icon';
import { LoadingBookFlip } from '@/components/loading-book-flip';

function LoginFallback() {
    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-foreground">
            <main className="max-w-sm w-full text-center">
                <LoadingBookFlip />
            </main>
        </div>
    );
}

function AdminLoginForm() {
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();
    const from = searchParams.get('from') ?? '/admin';

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            const res = await fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                setError(data.error ?? 'Invalid password');
                return;
            }
            router.push(from);
            router.refresh();
        } catch {
            setError('Something went wrong');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-foreground">
            <main className="max-w-sm w-full">
                <h1 className="font-heading text-2xl font-semibold text-center mb-6">
                    Admin login
                </h1>
                <form
                    onSubmit={handleSubmit}
                    className="space-y-4 p-6 rounded-xl bg-surface border border-border"
                >
                    <label
                        htmlFor="password"
                        className="block text-sm font-medium"
                    >
                        Password
                    </label>
                    <input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                        placeholder="Admin password"
                        autoComplete="current-password"
                        required
                    />
                    {error && (
                        <p className="text-sm text-red-600 dark:text-red-400">
                            {error}
                        </p>
                    )}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-lg bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium hover:bg-[var(--primary-hover)] disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 focus:ring-offset-[var(--background)]"
                    >
                        {loading ? 'Signing in…' : 'Sign in'}
                    </button>
                </form>
                <p className="text-center mt-4 text-sm text-muted">
                    <Link href="/" className="inline-flex items-center gap-1.5 justify-center underline hover:no-underline">
                        <BackArrowIcon className="size-4 shrink-0" />
                        Back to home
                    </Link>
                </p>
            </main>
        </div>
    );
}

export default function AdminLoginPage() {
    return (
        <Suspense fallback={<LoginFallback />}>
            <AdminLoginForm />
        </Suspense>
    );
}
