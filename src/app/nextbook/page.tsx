import Link from 'next/link';
import { BackArrowIcon } from '@/components/back-arrow-icon';
import Image from 'next/image';
import { getNextBook } from '@/lib/nextbook';
import { sanitiseBlurb } from '@/lib/sanitize-blurb';
import { StackOfBooks } from '@/components/stack-of-books';
import { ExpandableBlurb } from '@/components/expandable-blurb';

function formatMeetingDate(isoDate: string): string {
    const d = new Date(isoDate + 'T12:00:00');
    const day = d.getDate();
    const ordinal =
        day === 1 || day === 21 || day === 31
            ? 'st'
            : day === 2 || day === 22
              ? 'nd'
              : day === 3 || day === 23
                ? 'rd'
                : 'th';
    const month = d.toLocaleDateString('en-GB', { month: 'long' });
    const year = d.getFullYear();
    return `${day}${ordinal} ${month} ${year}`;
}

function formatMonthYear(isoDate: string): string {
    const d = new Date(isoDate + 'T12:00:00');
    const month = d.toLocaleDateString('en-GB', { month: 'long' });
    const year = d.getFullYear();
    return `${month} ${year}`;
}

export default async function NextBookPage() {
    const { winner, meetingDate, pastBooks } = await getNextBook();

    if (!winner) {
        return (
            <div className="min-h-screen bg-background text-foreground">
                <header className="border-b border-border bg-surface px-4 py-4">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground mb-2"
                    >
                        <BackArrowIcon className="size-4 shrink-0" />
                        Back to home
                    </Link>
                    <h1 className="font-heading text-xl font-semibold">Our current book</h1>
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
                    <BackArrowIcon className="size-4 shrink-0" />
                    Back to home
                </Link>
                <h1 className="font-heading text-xl font-semibold">Our current book</h1>
                {meetingDate && (
                    <p className="text-sm text-muted mt-1">
                        Book club: {formatMeetingDate(meetingDate)}
                    </p>
                )}
            </header>
            <main className="max-w-lg mx-auto p-6">
                <article className="rounded-lg border border-border bg-surface overflow-hidden">
                    <div className="p-4">
                        <div className="w-full flex justify-center">
                            <div className="relative w-28 h-40 bg-[var(--border)] rounded overflow-hidden">
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
                        </div>
                        <div className="mt-4">
                            <h2 className="text-lg font-semibold">
                                {winner.title}
                            </h2>
                            <p className="text-sm text-muted mt-1">
                                by {winner.author}
                            </p>
                            {winner.blurb && (
                                <ExpandableBlurb
                                    html={sanitiseBlurb(winner.blurb)}
                                    className="mt-3"
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

                {pastBooks.length > 0 && (
                    <section className="mt-8">
                        <h2 className="text-lg font-semibold text-foreground mb-3">
                            Past books
                        </h2>
                        <ul className="space-y-3">
                            {pastBooks.map((book) => (
                                <li
                                    key={`${book.meetingDate}-${book.title}`}
                                    className="rounded-lg border border-border bg-surface p-3"
                                >
                                    <p className="text-sm font-medium text-muted">
                                        {formatMonthYear(book.meetingDate)}
                                    </p>
                                    <p className="font-medium text-foreground mt-0.5">
                                        {book.title}
                                    </p>
                                    <p className="text-sm text-muted">
                                        by {book.author}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}

            </main>
        </div>
    );
}
