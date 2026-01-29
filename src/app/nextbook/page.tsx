import Link from 'next/link';
import Image from 'next/image';
import { getNextBook } from '@/lib/nextbook';

export default async function NextBookPage() {
    const { winner, meetingDate } = await getNextBook();

    if (!winner) {
        return (
            <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col items-center justify-center p-6">
                <main className="max-w-md text-center">
                    <h1 className="text-2xl font-semibold mb-2">Next book</h1>
                    <p className="text-zinc-600 dark:text-zinc-400">
                        No winner has been selected yet. Check back after the
                        next vote.
                    </p>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
            <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-4">
                <h1 className="text-xl font-semibold">Next book</h1>
                {meetingDate && (
                    <p className="text-sm text-zinc-500 mt-1">
                        Book club: {meetingDate}
                    </p>
                )}
            </header>
            <main className="max-w-lg mx-auto p-6">
                <article className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
                    <div className="flex gap-4 p-4">
                        <div className="flex-shrink-0 w-28 h-40 relative bg-zinc-200 dark:bg-zinc-700 rounded overflow-hidden">
                            {winner.coverUrl ? (
                                <Image
                                    src={winner.coverUrl}
                                    alt=""
                                    fill
                                    className="object-cover"
                                    unoptimized
                                    sizes="112px"
                                />
                            ) : (
                                <span className="text-sm text-zinc-400 flex items-center justify-center h-full">
                                    No cover
                                </span>
                            )}
                        </div>
                        <div className="min-w-0 flex-1">
                            <h2 className="text-lg font-semibold">
                                {winner.title}
                            </h2>
                            <p className="text-sm text-zinc-500 mt-1">
                                by {winner.author}
                            </p>
                            {winner.blurb && (
                                <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-3 line-clamp-4">
                                    {winner.blurb}
                                </p>
                            )}
                            {winner.link && (
                                <a
                                    href={winner.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-block mt-3 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:underline"
                                >
                                    View details
                                </a>
                            )}
                        </div>
                    </div>
                </article>
                <p className="mt-4 text-center">
                    <Link
                        href="/"
                        className="text-sm text-zinc-500 hover:underline"
                    >
                        Back to home
                    </Link>
                </p>
            </main>
        </div>
    );
}
