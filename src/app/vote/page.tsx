'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { BackArrowIcon } from '@/components/back-arrow-icon';
import { BookCoverImage } from '@/components/book-cover-image';
import { sanitiseBlurb } from '@/lib/sanitize-blurb';
import { getOrCreateVisitorKeyHash } from '@/lib/visitor-key';
import { LoadingMinDuration } from '@/components/loading-min-duration';
import { StackOfBooks } from '@/components/stack-of-books';

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
    requiresPassword?: boolean;
};

const SWIPE_THRESHOLD = 50;
const SWIPE_TRANSITION_MS = 280;

function formatMeetingDate(isoDate: string): string {
    const date = new Date(isoDate + 'T12:00:00');
    return new Intl.DateTimeFormat('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    }).format(date);
}

function formatCloseVoteDate(closeVoteAt: string): string {
    const date = new Date(closeVoteAt);
    return new Intl.DateTimeFormat('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    }).format(date);
}

export default function VotePage() {
    const [round, setRound] = useState<VoteRound | null>(null);
    const [books, setBooks] = useState<VoteBook[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [dragOffset, setDragOffset] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const pointerStartXRef = useRef<number | null>(null);
    const [submitStatus, setSubmitStatus] = useState<
        'idle' | 'pending' | 'success' | 'error'
    >('idle');
    const [submitMessage, setSubmitMessage] = useState<string | null>(null);
    const [accessPassword, setAccessPassword] = useState('');
    const [verifyPasswordStatus, setVerifyPasswordStatus] = useState<
        'idle' | 'pending' | 'error'
    >('idle');
    const [verifyPasswordError, setVerifyPasswordError] = useState<
        string | null
    >(null);
    const [alreadyVoted, setAlreadyVoted] = useState(false);
    const [chosenBookExternalId, setChosenBookExternalId] = useState<
        string | null
    >(null);
    const [showVoteConfirm, setShowVoteConfirm] = useState(false);

    const fetchRound = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const voterKeyHash = await getOrCreateVisitorKeyHash();
            const headers: Record<string, string> = {};
            if (voterKeyHash) {
                headers['X-Voter-Key-Hash'] = voterKeyHash;
            }
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);
            const res = await fetch('/api/votes', {
                headers,
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error ?? 'Failed to load vote');
            }
            const data = await res.json();
            setRound(data.round);
            setBooks(data.books ?? []);
            setAlreadyVoted(data.alreadyVoted ?? false);
            setChosenBookExternalId(data.chosenBookExternalId ?? null);
            setCurrentIndex(0);
        } catch (e) {
            const message =
                e instanceof Error
                    ? e.name === 'AbortError'
                        ? 'Request took too long. Please try again.'
                        : e.message
                    : 'Something went wrong';
            setError(message);
            setRound(null);
            setBooks([]);
            setAlreadyVoted(false);
            setChosenBookExternalId(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchRound();
    }, [fetchRound]);

    const handleVerifyPassword = useCallback(
        async (e: React.FormEvent) => {
            e.preventDefault();
            if (!round || !accessPassword.trim()) return;
            setVerifyPasswordStatus('pending');
            setVerifyPasswordError(null);
            try {
                const res = await fetch('/api/votes/verify-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        roundId: round.id,
                        password: accessPassword.trim(),
                    }),
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) {
                    throw new Error(data.error ?? 'Verification failed');
                }
                setAccessPassword('');
                setVerifyPasswordError(null);
                await fetchRound();
            } catch (e) {
                setVerifyPasswordStatus('error');
                setVerifyPasswordError(
                    e instanceof Error ? e.message : 'Incorrect password',
                );
            } finally {
                setVerifyPasswordStatus('idle');
            }
        },
        [round, accessPassword, fetchRound],
    );

    const goTo = useCallback(
        (index: number) => {
            const next = Math.max(0, Math.min(index, books.length - 1));
            setCurrentIndex(next);
        },
        [books.length],
    );

    const handlePointerStart = useCallback(
        (clientX: number) => {
            if (books.length <= 1) return;
            pointerStartXRef.current = clientX;
            setIsDragging(true);
            setDragOffset(0);
        },
        [books.length],
    );

    const handlePointerMove = useCallback((clientX: number) => {
        const startX = pointerStartXRef.current;
        if (startX === null) return;
        setDragOffset(clientX - startX);
    }, []);

    const handlePointerEnd = useCallback(
        (clientX: number) => {
            const startX = pointerStartXRef.current;
            pointerStartXRef.current = null;
            setIsDragging(false);
            if (startX === null || books.length <= 1) {
                setDragOffset(0);
                return;
            }
            const delta = startX - clientX;
            if (delta > SWIPE_THRESHOLD) goTo(currentIndex + 1);
            else if (delta < -SWIPE_THRESHOLD) goTo(currentIndex - 1);
            setDragOffset(0);
        },
        [currentIndex, books.length, goTo],
    );

    const handleTouchStart = useCallback(
        (e: React.TouchEvent) => {
            handlePointerStart(e.targetTouches[0].clientX);
        },
        [handlePointerStart],
    );
    const handleTouchMove = useCallback(
        (e: React.TouchEvent) => {
            handlePointerMove(e.targetTouches[0].clientX);
        },
        [handlePointerMove],
    );
    const handleTouchEnd = useCallback(
        (e: React.TouchEvent) => {
            handlePointerEnd(e.changedTouches[0].clientX);
        },
        [handlePointerEnd],
    );

    const handleMouseDown = useCallback(
        (e: React.MouseEvent) => {
            e.preventDefault();
            handlePointerStart(e.clientX);
        },
        [handlePointerStart],
    );

    useEffect(() => {
        if (!isDragging) return;
        const onMouseMove = (e: MouseEvent) => handlePointerMove(e.clientX);
        const onMouseUp = (e: MouseEvent) => {
            handlePointerEnd(e.clientX);
        };
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
    }, [isDragging, handlePointerMove, handlePointerEnd]);

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
            setAlreadyVoted(true);
            setChosenBookExternalId(books[currentIndex].externalId);
        } catch (e) {
            setSubmitStatus('error');
            setSubmitMessage(
                e instanceof Error ? e.message : 'Failed to submit vote',
            );
        }
    }, [round, books, currentIndex]);

    const slidePercent = books.length > 0 ? 100 / books.length : 100;
    const trackTranslateX = `calc(-${currentIndex * slidePercent}% + ${dragOffset}px)`;

    return (
        <LoadingMinDuration
            isLoading={loading}
            loaderWrapperClassName="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6"
        >
            {error ? (
                <div className="min-h-screen bg-background text-foreground">
                    <header className="border-b border-border bg-surface px-4 py-4">
                        <Link
                            href="/"
                            className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground mb-2"
                        >
                            <BackArrowIcon className="size-4 shrink-0" />
                            Back to home
                        </Link>
                        <h1 className="font-heading text-xl font-semibold">
                            Monthly book vote
                        </h1>
                    </header>
                    <main className="max-w-md mx-auto p-6 text-center">
                        <p
                            className="text-red-600 dark:text-red-400"
                            role="alert"
                        >
                            {error}
                        </p>
                    </main>
                </div>
            ) : round && round.requiresPassword && books.length === 0 ? (
                <div className="min-h-screen bg-background text-foreground">
                    <header className="border-b border-border bg-surface px-4 py-4">
                        <Link
                            href="/"
                            className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground mb-2"
                        >
                            <BackArrowIcon className="size-4 shrink-0" />
                            Back to home
                        </Link>
                        <h1 className="font-heading text-xl font-semibold">
                            Monthly book vote
                        </h1>
                        {round.meetingDate && (
                            <p className="text-sm text-muted mt-1">
                                Book club meet:{' '}
                                {formatMeetingDate(round.meetingDate)}
                            </p>
                        )}
                        {round.closeVoteAt && (
                            <p className="text-sm text-muted mt-0.5">
                                Vote closes:{' '}
                                {formatCloseVoteDate(round.closeVoteAt)}
                            </p>
                        )}
                    </header>
                    <main className="max-w-md mx-auto p-6">
                        <p className="text-muted text-center mb-4">
                            This vote round is protected. Enter the access
                            password to view and vote.
                        </p>
                        <form
                            onSubmit={handleVerifyPassword}
                            className="space-y-3"
                        >
                            <label
                                htmlFor="vote-access-password"
                                className="block text-sm font-medium text-foreground"
                            >
                                Access password
                            </label>
                            <input
                                id="vote-access-password"
                                type="password"
                                value={accessPassword}
                                onChange={(e) =>
                                    setAccessPassword(e.target.value)
                                }
                                placeholder="Password"
                                autoComplete="current-password"
                                disabled={verifyPasswordStatus === 'pending'}
                                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] disabled:opacity-50"
                                aria-describedby={
                                    verifyPasswordError
                                        ? 'vote-password-error'
                                        : undefined
                                }
                            />
                            {verifyPasswordError && (
                                <p
                                    id="vote-password-error"
                                    className="text-sm text-red-600 dark:text-red-400"
                                    role="alert"
                                >
                                    {verifyPasswordError}
                                </p>
                            )}
                            <button
                                type="submit"
                                disabled={
                                    verifyPasswordStatus === 'pending' ||
                                    !accessPassword.trim()
                                }
                                className="w-full rounded-lg bg-primary text-primary-foreground py-3 text-sm font-medium hover:bg-[var(--primary-hover)] disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 focus:ring-offset-[var(--background)]"
                            >
                                {verifyPasswordStatus === 'pending'
                                    ? 'Verifying…'
                                    : 'Continue'}
                            </button>
                        </form>
                    </main>
                </div>
            ) : !round || books.length === 0 ? (
                <div className="min-h-screen bg-background text-foreground">
                    <header className="border-b border-border bg-surface px-4 py-4">
                        <Link
                            href="/"
                            className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground mb-2"
                        >
                            <BackArrowIcon className="size-4 shrink-0" />
                            Back to home
                        </Link>
                        <h1 className="font-heading text-xl font-semibold">
                            Monthly book vote
                        </h1>
                    </header>
                    <main className="max-w-md mx-auto p-6 flex flex-col items-center justify-center min-h-[50vh] text-center">
                        <StackOfBooks
                            className="mb-4 text-muted"
                            width={100}
                            height={75}
                        />
                        <h2 className="text-lg font-semibold text-foreground mb-2">
                            No vote open at the moment
                        </h2>
                        <p className="text-muted max-w-sm">
                            We vote for the book we&apos;ll read and chat about
                            at the next meet-up. Check back when voting is
                            open—we&apos;d love your vote!
                        </p>
                        <Link
                            href="/"
                            className="mt-6 inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium hover:bg-[var(--primary-hover)]"
                        >
                            <BackArrowIcon className="size-4 shrink-0" />
                            Back to home
                        </Link>
                    </main>
                </div>
            ) : !round.isOpen ? (
                <div className="min-h-screen bg-background text-foreground">
                    <header className="border-b border-border bg-surface px-4 py-4">
                        <Link
                            href="/"
                            className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground mb-2"
                        >
                            <BackArrowIcon className="size-4 shrink-0" />
                            Back to home
                        </Link>
                        <h1 className="font-heading text-xl font-semibold">
                            Monthly book vote
                        </h1>
                    </header>
                    <main className="max-w-md mx-auto p-6 text-center">
                        <p className="text-foreground font-medium">
                            Voting closed
                        </p>
                        {round.meetingDate && (
                            <p className="text-sm text-muted mt-1">
                                Book club meet:{' '}
                                {formatMeetingDate(round.meetingDate)}
                            </p>
                        )}
                        {round.closeVoteAt && (
                            <p className="text-sm text-muted mt-0.5">
                                Vote closes:{' '}
                                {formatCloseVoteDate(round.closeVoteAt)}
                            </p>
                        )}
                    </main>
                </div>
            ) : (
                <>
                    <div className="min-h-screen bg-background text-foreground flex flex-col">
                        <header className="border-b border-border bg-surface px-4 py-4 shrink-0">
                            <Link
                                href="/"
                                className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground mb-2"
                            >
                                <BackArrowIcon className="size-4 shrink-0" />
                                Back to home
                            </Link>
                            <h1 className="font-heading text-xl font-semibold">
                                Monthly book vote
                            </h1>
                            {round.meetingDate && (
                                <p className="text-sm text-muted mt-1">
                                    Book club meet:{' '}
                                    {formatMeetingDate(round.meetingDate)}
                                </p>
                            )}
                            {round.closeVoteAt && (
                                <p className="text-sm text-muted mt-0.5">
                                    Vote closes:{' '}
                                    {formatCloseVoteDate(round.closeVoteAt)}
                                </p>
                            )}
                        </header>

                        <main className="flex-1 flex flex-col max-w-lg mx-auto w-full pb-44">
                            {/* Swipeable book cards with smooth drag and transition */}
                            <section
                                className="flex-1 min-h-0 flex flex-col px-4 pt-4 select-none relative"
                                onTouchStart={handleTouchStart}
                                onTouchMove={handleTouchMove}
                                onTouchEnd={handleTouchEnd}
                                onMouseDown={handleMouseDown}
                                style={{ touchAction: 'pan-y' }}
                            >
                                {books.length > 1 && (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                goTo(currentIndex - 1)
                                            }
                                            disabled={currentIndex === 0}
                                            className="absolute -left-1 top-[18%] z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] shadow-md disabled:opacity-40 disabled:pointer-events-none hover:bg-[var(--surface-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 focus:ring-offset-[var(--background)]"
                                            aria-label="Previous book"
                                        >
                                            <BackArrowIcon className="size-5 shrink-0" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                goTo(currentIndex + 1)
                                            }
                                            disabled={
                                                currentIndex ===
                                                books.length - 1
                                            }
                                            className="absolute -right-1 top-[18%] z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] shadow-md disabled:opacity-40 disabled:pointer-events-none hover:bg-[var(--surface-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 focus:ring-offset-[var(--background)]"
                                            aria-label="Next book"
                                        >
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                className="size-5 shrink-0"
                                                aria-hidden
                                            >
                                                <path d="M5 12h14M12 5l7 7-7 7" />
                                            </svg>
                                        </button>
                                    </>
                                )}
                                <div className="flex-1 min-h-[280px] overflow-hidden rounded-xl">
                                    <div
                                        className="h-full flex will-change-transform"
                                        style={{
                                            width: `${books.length * 100}%`,
                                            transform: `translateX(${trackTranslateX})`,
                                            transition: isDragging
                                                ? 'none'
                                                : `transform ${SWIPE_TRANSITION_MS}ms ease-out`,
                                        }}
                                    >
                                        {books.map((book) => (
                                            <div
                                                key={book.externalId}
                                                className="h-full flex flex-col flex-shrink-0 min-w-0"
                                                style={{
                                                    width: `${slidePercent}%`,
                                                }}
                                            >
                                                <div className="h-full flex flex-col rounded-xl border border-border bg-surface overflow-hidden">
                                                    <div className="relative w-full min-h-[200px] aspect-[3/4] shrink-0 bg-[var(--border)]">
                                                        <BookCoverImage
                                                            src={book.coverUrl}
                                                            containerClassName="absolute inset-0"
                                                            sizes="(max-width: 512px) 100vw, 512px"
                                                        />
                                                    </div>
                                                    <div className="p-4 flex-1 min-h-0 overflow-y-auto">
                                                        <h2 className="text-lg font-semibold">
                                                            {book.title}
                                                        </h2>
                                                        <p className="text-sm text-muted mt-0.5">
                                                            by {book.author}
                                                        </p>
                                                        {book.blurb && (
                                                            <div
                                                                className="text-sm text-muted mt-3 leading-relaxed blurb-prose [&_a]:underline [&_a]:text-foreground"
                                                                dangerouslySetInnerHTML={{
                                                                    __html: sanitiseBlurb(
                                                                        book.blurb,
                                                                    ),
                                                                }}
                                                            />
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </section>
                        </main>

                        {/* Fixed footer: pagination first, then vote status / CTA */}
                        <footer className="fixed bottom-0 left-0 right-0 border-t border-border bg-surface p-4 w-full">
                            {books.length > 0 && (
                                <div
                                    className="flex justify-center gap-2 pb-3"
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
                                                    ? 'w-6 bg-primary'
                                                    : 'w-2 bg-[var(--border)] hover:bg-[var(--surface-hover)]'
                                            }`}
                                        />
                                    ))}
                                </div>
                            )}
                            {alreadyVoted || submitStatus === 'success' ? (
                                <div className="text-center">
                                    <p
                                        className="text-green-600 dark:text-green-400 font-semibold"
                                        role="status"
                                    >
                                        {submitStatus === 'success'
                                            ? submitMessage
                                            : "You've already voted in this round."}
                                    </p>
                                    {chosenBookExternalId && (
                                        <p className="text-sm text-muted mt-1">
                                            You voted for{' '}
                                            {books.find(
                                                (b) =>
                                                    b.externalId ===
                                                    chosenBookExternalId,
                                            )?.title ?? 'this round'}
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <>
                                    <p className="text-center text-sm text-muted mb-2">
                                        Only 1 vote per round
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => setShowVoteConfirm(true)}
                                        disabled={submitStatus === 'pending'}
                                        className="w-full rounded-lg bg-primary text-primary-foreground py-3 text-sm font-medium hover:bg-[var(--primary-hover)] disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 focus:ring-offset-[var(--background)]"
                                    >
                                        {submitStatus === 'pending'
                                            ? 'Voting…'
                                            : (() => {
                                                  const b = books[currentIndex];
                                                  const title =
                                                      b?.title ?? 'this book';
                                                  const author =
                                                      b?.author ?? 'unknown';
                                                  return `Vote for '${title}' by ${author}`;
                                              })()}
                                    </button>
                                    {submitStatus === 'error' &&
                                        submitMessage && (
                                            <p
                                                className="mt-2 text-center text-sm text-red-600 dark:text-red-400"
                                                role="alert"
                                            >
                                                {submitMessage}
                                            </p>
                                        )}
                                </>
                            )}
                        </footer>
                    </div>

                    {/* Vote confirmation dialog */}
                    {showVoteConfirm && books[currentIndex] && (
                        <div
                            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="vote-confirm-title"
                            onClick={() => setShowVoteConfirm(false)}
                        >
                            <div
                                className="bg-surface rounded-xl shadow-xl max-w-sm w-full p-6"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <h2
                                    id="vote-confirm-title"
                                    className="text-lg font-semibold text-foreground mb-2"
                                >
                                    Confirm your vote
                                </h2>
                                <p className="text-sm text-muted mb-6">
                                    Are you sure you want to vote for{' '}
                                    <strong className="text-foreground">
                                        {'\u2018'}
                                        {books[currentIndex].title ??
                                            'this book'}
                                        {'\u2019'}
                                    </strong>{' '}
                                    by {books[currentIndex].author ?? 'unknown'}
                                    ?
                                </p>
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowVoteConfirm(false)
                                        }
                                        className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-medium hover:bg-[var(--surface-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 focus:ring-offset-[var(--background)]"
                                    >
                                        Back
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowVoteConfirm(false);
                                            handleSubmitVote();
                                        }}
                                        disabled={submitStatus === 'pending'}
                                        className="flex-1 rounded-lg bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium hover:bg-[var(--primary-hover)] disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 focus:ring-offset-[var(--background)]"
                                    >
                                        Confirm
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </LoadingMinDuration>
    );
}
