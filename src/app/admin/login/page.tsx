'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function LoginFallback() {
    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-6 text-zinc-900 dark:text-zinc-100">
            <main className="max-w-sm w-full text-center">
                <p className="text-zinc-500 dark:text-zinc-400">Loading…</p>
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
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-6 text-zinc-900 dark:text-zinc-100">
            <main className="max-w-sm w-full">
                <h1 className="text-2xl font-semibold text-center mb-6">
                    Admin login
                </h1>
                <form
                    onSubmit={handleSubmit}
                    className="space-y-4 p-6 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
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
                        className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500"
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
                        className="w-full rounded-lg bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900 px-4 py-2.5 text-sm font-medium hover:bg-zinc-700 dark:hover:bg-zinc-300 disabled:opacity-50"
                    >
                        {loading ? 'Signing in…' : 'Sign in'}
                    </button>
                </form>
                <p className="text-center mt-4 text-sm text-zinc-500">
                    <Link href="/" className="underline hover:no-underline">
                        ← Back to home
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
