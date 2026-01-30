'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { sanitiseBlurb } from '@/lib/sanitize-blurb';
import { getOrCreateVisitorKeyHash } from '@/lib/visitor-key';

type VoteBook = {
    id: number;
    voteRoundId: number;
    externalId: string;
    title: string;
    author: string;
    coverUrl: string | null;
    blurb: string | null;
    link: string | null;
};

type VoteRound = {
    id: number;
    meetingDate: string;
    closeVoteAt: string | null;
    selectedBookIds: string[];
    winnerExternalId: string | null;
    isOpen: boolean;
};

const SWIPE_THRESHOLD = 50;

export default function VotePage() {
    const [round, setRound] = useState<VoteRound | null>(null);
    const [books, setBooks] = useState<VoteBook[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const touchStartXRef = useRef<number | null>(null);
    const [submitStatus, setSubmitStatus] = useState<
        'idle' | 'pending' | 'success' | 'error'
    >('idle');
    const [submitMessage, setSubmitMessage] = useState<string | null>(null);

    const fetchRound = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/votes');
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error ?? 'Failed to load vote');
            }
            const data = await res.json();
            setRound(data.round);
            setBooks(data.books ?? []);
            setCurrentIndex(0);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Something went wrong');
            setRound(null);
            setBooks([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchRound();
    }, [fetchRound]);

    const goTo = useCallback(
        (index: number) => {
            const next = Math.max(0, Math.min(index, books.length - 1));
            setCurrentIndex(next);
        },
        [books.length],
    );

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        touchStartXRef.current = e.targetTouches[0].clientX;
    }, []);

    const handleTouchEnd = useCallback(
        (e: React.TouchEvent) => {
            const startX = touchStartXRef.current;
            touchStartXRef.current = null;
            if (startX === null || books.length <= 1) return;
            const endX = e.changedTouches[0].clientX;
            const delta = startX - endX;
            if (delta > SWIPE_THRESHOLD) goTo(currentIndex + 1);
            else if (delta < -SWIPE_THRESHOLD) goTo(currentIndex - 1);
        },
        [currentIndex, books.length, goTo],
    );

    const handleSubmitVote = useCallback(async () => {
        if (!round?.isOpen || !books[currentIndex]) return;
        setSubmitStatus('pending');
        setSubmitMessage(null);
        try {
            const voterKeyHash = await getOrCreateVisitorKeyHash();
            const res = await fetch('/api/votes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    voteRoundId: round.id,
                    chosenBookExternalId: books[currentIndex].externalId,
                    voterKeyHash,
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(data.error ?? 'Failed to submit vote');
            }
            setSubmitStatus('success');
            setSubmitMessage('Your vote has been recorded. Thank you!');
        } catch (e) {
            setSubmitStatus('error');
            setSubmitMessage(
                e instanceof Error ? e.message : 'Failed to submit vote',
            );
        }
    }, [round, books, currentIndex]);

    if (loading) {
        return (
            <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col items-center justify-center p-6">
                <p className="text-zinc-500 dark:text-zinc-400">Loading…</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
                <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-4">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 mb-2"
                    >
                        ← Back to home
                    </Link>
                    <h1 className="text-xl font-semibold">Vote</h1>
                </header>
                <main className="max-w-md mx-auto p-6 text-center">
                    <p className="text-red-600 dark:text-red-400" role="alert">
                        {error}
                    </p>
                </main>
            </div>
        );
    }

    if (!round || books.length === 0) {
        return (
            <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
                <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-4">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 mb-2"
                    >
                        ← Back to home
                    </Link>
                    <h1 className="text-xl font-semibold">Vote</h1>
                </header>
                <main className="max-w-md mx-auto p-6 text-center">
                    <p className="text-zinc-600 dark:text-zinc-400">
                        No vote is available right now. Check back later.
                    </p>
                </main>
            </div>
        );
    }

    if (!round.isOpen) {
        return (
            <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
                <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-4">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 mb-2"
                    >
                        ← Back to home
                    </Link>
                    <h1 className="text-xl font-semibold">Vote</h1>
                </header>
                <main className="max-w-md mx-auto p-6 text-center">
                    <p className="text-zinc-700 dark:text-zinc-300 font-medium">
                        Voting closed
                    </p>
                    {round.meetingDate && (
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                            Book club meeting: {round.meetingDate}
                        </p>
                    )}
                </main>
            </div>
        );
    }

    const book = books[currentIndex];

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col">
            <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-4 shrink-0">
                <Link
                    href="/"
                    className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 mb-2"
                >
                    ← Back to home
                </Link>
                <h1 className="text-xl font-semibold">Vote</h1>
                {round.meetingDate && (
                    <p className="text-sm text-zinc-500 mt-1">
                        Meeting: {round.meetingDate}
                    </p>
                )}
            </header>

            <main className="flex-1 flex flex-col max-w-lg mx-auto w-full">
                {/* Swipeable book card — one at a time */}
                <section
                    className="flex-1 min-h-0 flex flex-col px-4 pt-4"
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                >
                    <div className="flex-1 min-h-0 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col">
                        {book.coverUrl ? (
                            <div className="relative w-full aspect-[3/4] shrink-0 bg-zinc-200 dark:bg-zinc-800">
                                <Image
                                    src={book.coverUrl}
                                    alt=""
                                    fill
                                    className="object-cover"
                                    unoptimized
                                    sizes="(max-width: 512px) 100vw, 512px"
                                />
                            </div>
                        ) : (
                            <div className="w-full aspect-[3/4] shrink-0 bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center">
                                <span className="text-zinc-400 dark:text-zinc-500 text-sm">
                                    No cover
                                </span>
                            </div>
                        )}
                        <div className="p-4 flex-1 min-h-0 overflow-y-auto">
                            <h2 className="text-lg font-semibold">
                                {book.title}
                            </h2>
                            <p className="text-sm text-zinc-500 mt-0.5">
                                by {book.author}
                            </p>
                            {book.blurb && (
                                <div
                                    className="text-sm text-zinc-600 dark:text-zinc-400 mt-3 leading-relaxed [&_p]:my-1 [&_a]:underline [&_a]:text-zinc-700 dark:[&_a]:text-zinc-300"
                                    dangerouslySetInnerHTML={{
                                        __html: sanitiseBlurb(book.blurb),
                                    }}
                                />
                            )}
                        </div>
                    </div>

                    {/* Dots */}
                    <div
                        className="flex justify-center gap-2 py-4"
                        role="tablist"
                        aria-label="Book options"
                    >
                        {books.map((_, i) => (
                            <button
                                key={i}
                                type="button"
                                onClick={() => goTo(i)}
                                role="tab"
                                aria-selected={i === currentIndex}
                                aria-label={`Book ${i + 1} of ${books.length}`}
                                className={`h-2 rounded-full transition-colors ${
                                    i === currentIndex
                                        ? 'w-6 bg-zinc-800 dark:bg-zinc-200'
                                        : 'w-2 bg-zinc-300 dark:bg-zinc-600 hover:bg-zinc-400 dark:hover:bg-zinc-500'
                                }`}
                            />
                        ))}
                    </div>
                </section>

                {/* Vote for this book */}
                <section className="p-4 pt-0 pb-8">
                    {submitStatus === 'success' ? (
                        <p
                            className="text-center text-green-600 dark:text-green-400 font-medium"
                            role="status"
                        >
                            {submitMessage}
                        </p>
                    ) : (
                        <>
                            <p className="text-center text-sm text-zinc-500 dark:text-zinc-400 mb-2">
                                Only 1 vote
                            </p>
                            <button
                                type="button"
                                onClick={handleSubmitVote}
                                disabled={submitStatus === 'pending'}
                                className="w-full rounded-lg bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900 py-3 text-sm font-medium hover:bg-zinc-700 dark:hover:bg-zinc-300 disabled:opacity-50"
                            >
                                {submitStatus === 'pending'
                                    ? 'Voting…'
                                    : 'Vote for this'}
                            </button>
                            {submitStatus === 'error' && submitMessage && (
                                <p
                                    className="mt-2 text-center text-sm text-red-600 dark:text-red-400"
                                    role="alert"
                                >
                                    {submitMessage}
                                </p>
                            )}
                        </>
                    )}
                </section>
            </main>
        </div>
    );
}
