import Link from 'next/link';

export default function AdminPage() {
    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-6 text-zinc-900 dark:text-zinc-100">
            <main className="max-w-md w-full text-center space-y-6">
                <h1 className="text-2xl font-semibold">Admin</h1>
                <div className="flex flex-col sm:flex-row flex-wrap gap-3 justify-center">
                    <Link
                        href="/admin/voting-builder"
                        className="inline-flex items-center justify-center rounded-lg bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900 px-5 py-2.5 text-sm font-medium hover:bg-zinc-700 dark:hover:bg-zinc-300"
                    >
                        Voting page builder
                    </Link>
                    <Link
                        href="/admin/question-builder"
                        className="inline-flex items-center justify-center rounded-lg bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900 px-5 py-2.5 text-sm font-medium hover:bg-zinc-700 dark:hover:bg-zinc-300"
                    >
                        Question builder
                    </Link>
                </div>
                <p className="text-sm text-zinc-500 space-x-4">
                    <Link href="/" className="underline hover:no-underline">
                        ← Back to home
                    </Link>
                    <Link
                        href="/api/admin/logout"
                        className="underline hover:no-underline"
                    >
                        Sign out
                    </Link>
                </p>
            </main>
        </div>
    );
}
