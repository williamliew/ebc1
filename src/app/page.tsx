import Link from 'next/link';

export default function Home() {
    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-6 text-zinc-900 dark:text-zinc-100">
            <main className="max-w-md w-full text-center space-y-6">
                <h1 className="text-2xl font-semibold">Elwood Book Club</h1>
                <p className="text-zinc-600 dark:text-zinc-400">Admin pages</p>
                <div className="flex flex-col sm:flex-row flex-wrap gap-3 justify-center">
                    <Link
                        href="/admin/voting-builder"
                        className="inline-flex items-center justify-center rounded-lg bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900 px-5 py-2.5 text-sm font-medium hover:bg-zinc-700 dark:hover:bg-zinc-300"
                    >
                        Voting page builder
                    </Link>
                    <Link
                        href="/admin/question-builder"
                        className="inline-flex items-center justify-center rounded-lg border border-zinc-300 dark:border-zinc-700 px-5 py-2.5 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                        Question builder
                    </Link>
                </div>

                <p className="text-zinc-600 dark:text-zinc-400">
                    Member/"Public" pages
                </p>
                <div className="flex flex-col sm:flex-row flex-wrap gap-3 justify-center">
                    <Link
                        href="/nextbook"
                        className="inline-flex items-center justify-center rounded-lg border border-zinc-300 dark:border-zinc-700 px-5 py-2.5 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                        Next book
                    </Link>
                </div>
            </main>
        </div>
    );
}
