import Link from 'next/link';
import Image from 'next/image';
import { getNextBook } from '@/lib/nextbook';
import { sanitiseBlurb } from '@/lib/sanitize-blurb';
import { StackOfBooks } from '@/components/stack-of-books';

export default async function NextBookPage() {
    const { winner, meetingDate } = await getNextBook();

    if (!winner) {
        return (
            <div className="min-h-screen bg-background text-foreground">
                <header className="border-b border-border bg-surface px-4 py-4">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground mb-2"
                    >
                        ← Back to home
                    </Link>
                    <h1 className="text-xl font-semibold">Next book</h1>
                </header>
                <main className="max-w-md mx-auto p-6 flex flex-col items-center justify-center min-h-[50vh] text-center">
                    <StackOfBooks
                        className="mb-4 text-muted"
                        width={100}
                        height={75}
                    />
                    <h2 className="text-lg font-semibold text-foreground mb-2">
                        No book chosen yet
                    </h2>
                    <p className="text-muted max-w-sm">
                        We&apos;ll have a winner after the next vote—check back
                        soon to see what we&apos;re reading!
                    </p>
                    <Link
                        href="/"
                        className="mt-6 inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium hover:bg-[var(--primary-hover)]"
                    >
                        Back to home
                    </Link>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground">
            <header className="border-b border-border bg-surface px-4 py-4">
                <Link
                    href="/"
                    className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground mb-2"
                >
                    ← Back to home
                </Link>
                <h1 className="text-xl font-semibold">Next book</h1>
                {meetingDate && (
                    <p className="text-sm text-muted mt-1">
                        Book club: {meetingDate}
                    </p>
                )}
            </header>
            <main className="max-w-lg mx-auto p-6">
                <article className="rounded-lg border border-border bg-surface overflow-hidden">
                    <div className="flex gap-4 p-4">
                        <div className="flex-shrink-0 w-28 h-40 relative bg-[var(--border)] rounded overflow-hidden">
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
                                <span className="text-sm text-muted flex items-center justify-center h-full">
                                    No cover
                                </span>
                            )}
                        </div>
                        <div className="min-w-0 flex-1">
                            <h2 className="text-lg font-semibold">
                                {winner.title}
                            </h2>
                            <p className="text-sm text-muted mt-1">
                                by {winner.author}
                            </p>
                            {winner.blurb && (
                                <div
                                    className="text-sm text-muted mt-3 line-clamp-4 [&_p]:my-1 [&_a]:underline [&_a]:text-foreground"
                                    dangerouslySetInnerHTML={{
                                        __html: sanitiseBlurb(winner.blurb),
                                    }}
                                />
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
                        className="text-sm text-muted hover:underline"
                    >
                        Back to home
                    </Link>
                </p>
            </main>
        </div>
    );
}
