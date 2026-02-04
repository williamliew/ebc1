'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { sanitiseBlurb } from '@/lib/sanitize-blurb';
import { getOrCreateVisitorKeyHash } from '@/lib/visitor-key';
import { LoadingBookFlip } from '@/components/loading-book-flip';
import { LoadingMinDuration } from '@/components/loading-min-duration';

const MAX_SUGGESTIONS_PER_PERSON = 2;

type SuggestionRound = {
    id: number;
    suggestionsForDate: string | null;
    label: string | null;
    closeAt: string | null;
    requiresPassword: boolean;
};

type SuggestionItem = {
    id: number;
    bookExternalId: string;
    title: string | null;
    author: string | null;
    coverUrl: string | null;
    blurb: string | null;
    link: string | null;
    suggestedByMe: boolean;
};

type BookSearchResult = {
    externalId: string;
    title: string;
    author: string;
    coverUrl: string | null;
    coverOptions?: string[];
    blurb: string | null;
    link: string | null;
};

type ReviewBook = BookSearchResult & {
    coverOptions: string[];
    selectedCoverIndex: number;
    manualOverride: string | null;
};

function formatMonthOnly(isoDate: string | null): string {
    if (!isoDate) return '';
    const d = new Date(isoDate + 'T12:00:00');
    if (Number.isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('en-GB', { month: 'long' }).format(d);
}

function formatDayMonth(isoDate: string | null): string {
    if (!isoDate) return '';
    const d = new Date(isoDate);
    if (Number.isNaN(d.getTime())) return '';
    const day = d.getDate();
    const suffix =
        day === 1 || day === 21 || day === 31
            ? 'st'
            : day === 2 || day === 22
              ? 'nd'
              : day === 3 || day === 23
                ? 'rd'
                : 'th';
    const month = new Intl.DateTimeFormat('en-GB', { month: 'long' }).format(d);
    return `${day}${suffix} ${month}`;
}

function getEffectiveCoverUrl(book: ReviewBook): string | null {
    if (book.manualOverride != null && book.manualOverride.trim() !== '') {
        return book.manualOverride.trim();
    }
    if (
        book.coverOptions?.length &&
        book.selectedCoverIndex >= 0 &&
        book.selectedCoverIndex < book.coverOptions.length
    ) {
        return book.coverOptions[book.selectedCoverIndex] ?? null;
    }
    return book.coverUrl;
}

export default function SuggestNextBookPage() {
    const [round, setRound] = useState<SuggestionRound | null>(null);
    const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
    const [userSuggestionCount, setUserSuggestionCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [suggesterKeyHash, setSuggesterKeyHash] = useState<string | null>(
        null,
    );
    const [accessPassword, setAccessPassword] = useState('');
    const [passwordStatus, setPasswordStatus] = useState<
        'idle' | 'pending' | 'error'
    >('idle');
    const [passwordError, setPasswordError] = useState<string | null>(null);
    const [readMoreBook, setReadMoreBook] = useState<SuggestionItem | null>(
        null,
    );
    const [confirmSuggest, setConfirmSuggest] = useState<SuggestionItem | null>(
        null,
    );
    const [confirmPending, setConfirmPending] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [modalStep, setModalStep] = useState<
        'search' | 'results' | 'review' | 'success'
    >('search');
    const [titleSearch, setTitleSearch] = useState('');
    const [authorSearch, setAuthorSearch] = useState('');
    const [searchResults, setSearchResults] = useState<BookSearchResult[]>([]);
    const [searchPending, setSearchPending] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);
    const [selectedBook, setSelectedBook] = useState<ReviewBook | null>(null);
    const [suggestPending, setSuggestPending] = useState(false);
    const [suggestSuccess, setSuggestSuccess] = useState(false);
    const [suggestError, setSuggestError] = useState<string | null>(null);

    const fetchRound = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/suggestion-rounds?current=1');
            const data = await res.json();
            setRound(data.round ?? null);
        } catch {
            setRound(null);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchSuggestions = useCallback(async () => {
        if (!round || !suggesterKeyHash) return;
        try {
            const res = await fetch(`/api/suggestions?roundId=${round.id}`, {
                headers: { 'X-Suggester-Key-Hash': suggesterKeyHash },
            });
            if (!res.ok) return;
            const data = await res.json();
            setSuggestions(data.suggestions ?? []);
            setUserSuggestionCount(data.userSuggestionCount ?? 0);
        } catch {
            // ignore
        }
    }, [round?.id, suggesterKeyHash]);

    useEffect(() => {
        fetchRound();
    }, [fetchRound]);

    useEffect(() => {
        let cancelled = false;
        getOrCreateVisitorKeyHash().then((hash) => {
            if (!cancelled) setSuggesterKeyHash(hash);
        });
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (round && suggesterKeyHash && !round.requiresPassword) {
            fetchSuggestions();
        }
    }, [round, suggesterKeyHash, round?.requiresPassword, fetchSuggestions]);

    const handleVerifyPassword = useCallback(
        async (e: React.FormEvent) => {
            e.preventDefault();
            if (!round || !accessPassword.trim()) return;
            setPasswordStatus('pending');
            setPasswordError(null);
            try {
                const res = await fetch('/api/suggestions/verify-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        roundId: round.id,
                        password: accessPassword.trim(),
                    }),
                    credentials: 'include',
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) {
                    throw new Error(data.error ?? 'Verification failed');
                }
                setRound((r) => (r ? { ...r, requiresPassword: false } : null));
                fetchSuggestions();
            } catch (err) {
                setPasswordError(
                    err instanceof Error ? err.message : 'Incorrect password',
                );
                setPasswordStatus('error');
            }
        },
        [round, accessPassword, fetchSuggestions],
    );

    const handleSuggestThisToo = useCallback(
        async (item: SuggestionItem) => {
            if (
                !round ||
                !suggesterKeyHash ||
                userSuggestionCount >= MAX_SUGGESTIONS_PER_PERSON
            )
                return;
            setConfirmPending(true);
            try {
                const res = await fetch('/api/suggestions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        suggestionRoundId: round.id,
                        bookExternalId: item.bookExternalId,
                        suggesterKeyHash,
                        title: item.title ?? 'Unknown',
                        author: item.author ?? 'Unknown',
                        coverUrl: item.coverUrl,
                        blurb: item.blurb,
                        link: item.link,
                    }),
                    credentials: 'include',
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(data.error ?? 'Failed to suggest');
                setConfirmSuggest(null);
                fetchSuggestions();
            } catch {
                // could show toast
            } finally {
                setConfirmPending(false);
            }
        },
        [round, suggesterKeyHash, userSuggestionCount, fetchSuggestions],
    );

    const handleSearch = useCallback(
        async (e: React.FormEvent) => {
            e.preventDefault();
            const title = titleSearch.trim();
            const author = authorSearch.trim();
            if (!title && !author) return;
            setSearchPending(true);
            setSearchError(null);
            try {
                const res = await fetch('/api/books/search', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title, author, page: 1 }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error ?? 'Search failed');
                setSearchResults(data.results ?? []);
                setModalStep('results');
            } catch (err) {
                setSearchError(
                    err instanceof Error ? err.message : 'Search failed',
                );
            } finally {
                setSearchPending(false);
            }
        },
        [titleSearch, authorSearch],
    );

    const handleSelectBook = useCallback((book: BookSearchResult) => {
        const opts =
            book.coverOptions ?? (book.coverUrl ? [book.coverUrl] : []);
        const matchIndex =
            opts.length > 0 && book.coverUrl ? opts.indexOf(book.coverUrl) : -1;
        const selectedCoverIndex =
            matchIndex >= 0 ? matchIndex : Math.max(0, opts.length - 1);
        setSelectedBook({
            ...book,
            coverOptions: opts,
            selectedCoverIndex,
            manualOverride: null,
        });
        setModalStep('review');
    }, []);

    const updateReviewBook = useCallback(
        (field: keyof ReviewBook, value: string | number | null) => {
            setSelectedBook((b) => (b ? { ...b, [field]: value } : null));
        },
        [],
    );

    const closeModal = useCallback(() => {
        setModalOpen(false);
        setModalStep('search');
        setSelectedBook(null);
        setSearchResults([]);
        setTitleSearch('');
        setAuthorSearch('');
        setSearchError(null);
        setSuggestSuccess(false);
        setSuggestError(null);
    }, []);

    const handleSuggestNewBook = useCallback(async () => {
        if (!round || !suggesterKeyHash || !selectedBook) return;
        setSuggestPending(true);
        try {
            const coverUrl = getEffectiveCoverUrl(selectedBook);
            const res = await fetch('/api/suggestions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    suggestionRoundId: round.id,
                    bookExternalId: selectedBook.externalId,
                    suggesterKeyHash,
                    title: selectedBook.title,
                    author: selectedBook.author,
                    coverUrl,
                    blurb: selectedBook.blurb,
                    link: selectedBook.link,
                }),
                credentials: 'include',
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error ?? 'Failed to suggest');
            setSuggestError(null);
            setSuggestPending(false);
            closeModal();
            await fetchSuggestions();
        } catch (err) {
            setSuggestError(
                err instanceof Error ? err.message : 'Failed to suggest',
            );
            setSuggestPending(false);
        }
    }, [round, suggesterKeyHash, selectedBook, fetchSuggestions, closeModal]);

    const uniqueSuggestions = useMemo(() => {
        const byBook = new Map<string, SuggestionItem>();
        for (const item of suggestions) {
            const existing = byBook.get(item.bookExternalId);
            if (!existing) {
                byBook.set(item.bookExternalId, { ...item });
            } else if (item.suggestedByMe) {
                byBook.set(item.bookExternalId, {
                    ...existing,
                    suggestedByMe: true,
                });
            }
        }
        return Array.from(byBook.values());
    }, [suggestions]);

    const suggestionsLeft = round
        ? MAX_SUGGESTIONS_PER_PERSON - userSuggestionCount
        : 0;
    const canSuggestMore = suggestionsLeft > 0;

    return (
        <LoadingMinDuration
            isLoading={loading}
            loaderWrapperClassName="min-h-screen bg-background text-foreground flex items-center justify-center p-6"
        >
            {!round ? (
                <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6">
                    <h1 className="text-xl font-semibold mb-2">
                        Suggestions closed
                    </h1>
                    <p className="text-muted text-center max-w-md">
                        Suggestions for the next book are currently closed. We
                        open suggestions for a short period each month—check
                        back later or ask the organisers when the next window
                        opens.
                    </p>
                    <Link
                        href="/"
                        className="mt-6 text-sm text-primary underline hover:no-underline"
                    >
                        ← Back to home
                    </Link>
                </div>
            ) : round.requiresPassword ? (
                <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6">
                    <h1 className="text-xl font-semibold mb-2">
                        Suggest next book
                    </h1>
                    <p className="text-muted text-center mb-4">
                        Enter the access password to continue.
                    </p>
                    <form
                        onSubmit={handleVerifyPassword}
                        className="w-full max-w-sm space-y-3"
                    >
                        <input
                            type="password"
                            value={accessPassword}
                            onChange={(e) => setAccessPassword(e.target.value)}
                            placeholder="Password"
                            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                            autoComplete="current-password"
                        />
                        {passwordError && (
                            <p
                                className="text-sm text-red-600 dark:text-red-400"
                                role="alert"
                            >
                                {passwordError}
                            </p>
                        )}
                        <button
                            type="submit"
                            disabled={passwordStatus === 'pending'}
                            className="w-full rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-[var(--primary-hover)] disabled:opacity-50"
                        >
                            {passwordStatus === 'pending'
                                ? 'Checking…'
                                : 'Continue'}
                        </button>
                    </form>
                    <Link
                        href="/"
                        className="mt-6 text-sm text-muted underline hover:no-underline"
                    >
                        ← Back to home
                    </Link>
                </div>
            ) : (
                <div className="min-h-screen bg-background text-foreground flex flex-col pb-24">
                    <header className="border-b border-border bg-surface px-4 py-4">
                        <Link
                            href="/"
                            className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground mb-2"
                        >
                            ← Back to home
                        </Link>
                        <h1 className="text-xl font-semibold">
                            Suggest next book
                        </h1>
                        {(round.suggestionsForDate || round.closeAt) && (
                            <p className="text-sm text-muted mt-1">
                                Taking suggestions for{' '}
                                {round.suggestionsForDate
                                    ? formatMonthOnly(round.suggestionsForDate)
                                    : 'this book'}
                                .{' '}
                                {round.closeAt ? (
                                    <>
                                        Submissions close end of day{' '}
                                        <strong>
                                            {formatDayMonth(round.closeAt)}
                                        </strong>
                                    </>
                                ) : (
                                    ''
                                )}
                            </p>
                        )}
                        <p className="text-sm text-muted mt-1">
                            You have used <strong>{userSuggestionCount}</strong>{' '}
                            of {MAX_SUGGESTIONS_PER_PERSON} suggestions this
                            round. You have <strong>{suggestionsLeft}</strong>{' '}
                            suggestion
                            {suggestionsLeft !== 1 ? 's' : ''} left.
                        </p>
                    </header>

                    <main className="max-w-lg mx-auto w-full p-4 flex-1">
                        <section>
                            <h2 className="text-sm font-medium text-muted mb-2">
                                Current suggestions
                            </h2>
                            {uniqueSuggestions.length === 0 ? (
                                <p className="text-muted text-sm">
                                    No books suggested yet. Be the first!
                                </p>
                            ) : (
                                <ul className="space-y-4">
                                    {uniqueSuggestions.map((item) => (
                                        <li
                                            key={item.bookExternalId}
                                            className="relative rounded-xl border border-border bg-surface p-4 flex gap-3"
                                        >
                                            {item.suggestedByMe && (
                                                <span
                                                    role="img"
                                                    aria-label="You suggested this book"
                                                    className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-primary"
                                                    title="You suggested this book"
                                                >
                                                    <svg
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth="2.5"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        className="h-4 w-4"
                                                        aria-hidden
                                                    >
                                                        <path d="M20 6L9 17l-5-5" />
                                                    </svg>
                                                </span>
                                            )}
                                            {item.coverUrl ? (
                                                <div className="relative w-16 h-[96px] shrink-0 rounded overflow-hidden bg-[var(--border)]">
                                                    <Image
                                                        src={item.coverUrl}
                                                        alt=""
                                                        fill
                                                        className="object-cover"
                                                        unoptimized
                                                        sizes="64px"
                                                    />
                                                </div>
                                            ) : (
                                                <div className="w-16 h-[96px] shrink-0 rounded bg-[var(--border)] flex items-center justify-center">
                                                    <span className="text-xs text-muted">
                                                        No cover
                                                    </span>
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0 flex flex-col">
                                                <p className="font-medium">
                                                    {item.title ??
                                                        'Unknown title'}
                                                </p>
                                                <p className="text-sm text-muted">
                                                    by{' '}
                                                    {item.author ??
                                                        'Unknown author'}
                                                </p>
                                                <div className="flex flex-wrap gap-2 mt-2">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setReadMoreBook(
                                                                item,
                                                            )
                                                        }
                                                        className="text-sm text-primary underline hover:no-underline"
                                                    >
                                                        Read more
                                                    </button>
                                                </div>
                                            </div>
                                            {!item.suggestedByMe &&
                                                canSuggestMore && (
                                                    <div className="flex items-center shrink-0">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setConfirmSuggest(
                                                                    item,
                                                                )
                                                            }
                                                            className="rounded-lg bg-primary text-primary-foreground px-3 py-2 text-sm font-medium hover:bg-[var(--primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 focus:ring-offset-[var(--background)]"
                                                        >
                                                            Suggest this too!
                                                        </button>
                                                    </div>
                                                )}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>
                    </main>

                    {/* Fixed footer */}
                    <footer className="fixed bottom-0 left-0 right-0 border-t border-border bg-surface p-4">
                        {canSuggestMore ? (
                            <button
                                type="button"
                                onClick={() => setModalOpen(true)}
                                className="w-full max-w-lg mx-auto flex justify-center rounded-lg bg-primary text-primary-foreground px-4 py-3 text-sm font-medium hover:bg-[var(--primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 focus:ring-offset-[var(--background)]"
                            >
                                Suggest a new book
                            </button>
                        ) : (
                            <p className="text-center text-sm text-muted">
                                You&apos;ve used up all your suggestions.
                            </p>
                        )}
                    </footer>

                    {/* Read more popup */}
                    {readMoreBook && (
                        <div
                            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                            role="dialog"
                            aria-modal="true"
                            aria-label="Book details"
                            onClick={() => setReadMoreBook(null)}
                        >
                            <div
                                className="bg-surface rounded-xl shadow-xl max-w-md w-full max-h-[85vh] overflow-hidden flex flex-col"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="p-4 border-b border-border flex justify-between items-start">
                                    <h3 className="text-lg font-semibold pr-8">
                                        {readMoreBook.title ?? 'Unknown title'}
                                    </h3>
                                    <button
                                        type="button"
                                        onClick={() => setReadMoreBook(null)}
                                        className="rounded p-1 -m-1 hover:bg-[var(--surface-hover)]"
                                        aria-label="Close"
                                    >
                                        ×
                                    </button>
                                </div>
                                <div className="p-4 overflow-y-auto flex-1">
                                    {readMoreBook.coverUrl && (
                                        <div className="relative w-full aspect-[3/4] max-w-[200px] mx-auto mb-4 rounded overflow-hidden bg-[var(--border)]">
                                            <Image
                                                src={readMoreBook.coverUrl}
                                                alt=""
                                                fill
                                                className="object-cover"
                                                unoptimized
                                                sizes="200px"
                                            />
                                        </div>
                                    )}
                                    <p className="text-sm text-muted mb-4">
                                        by{' '}
                                        {readMoreBook.author ??
                                            'Unknown author'}
                                    </p>
                                    {readMoreBook.blurb ? (
                                        <div
                                            className="text-sm prose prose-sm dark:prose-invert max-w-none"
                                            dangerouslySetInnerHTML={{
                                                __html: sanitiseBlurb(
                                                    readMoreBook.blurb,
                                                ),
                                            }}
                                        />
                                    ) : (
                                        <p className="text-sm text-muted">
                                            No description available.
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Confirm "Suggest this too" popup */}
                    {confirmSuggest && (
                        <div
                            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                            role="dialog"
                            aria-modal="true"
                            aria-label="Confirm suggestion"
                            onClick={() => setConfirmSuggest(null)}
                        >
                            <div
                                className="bg-surface rounded-xl shadow-xl max-w-sm w-full p-6"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <p className="text-sm mb-4">
                                    Are you sure you want to suggest{' '}
                                    <strong>
                                        {confirmSuggest.title ??
                                            'Unknown title'}
                                    </strong>{' '}
                                    by{' '}
                                    {confirmSuggest.author ?? 'Unknown author'}?
                                    This action can&apos;t be changed.
                                </p>
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setConfirmSuggest(null)}
                                        className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-[var(--surface-hover)]"
                                    >
                                        Back
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            handleSuggestThisToo(confirmSuggest)
                                        }
                                        disabled={confirmPending}
                                        className="flex-1 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-[var(--primary-hover)] disabled:opacity-50"
                                    >
                                        {confirmPending
                                            ? 'Adding…'
                                            : "Yes, I'm sure!"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Modal: Suggest a new book (search -> results -> review -> success) */}
                    {modalOpen && (
                        <div
                            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                            role="dialog"
                            aria-modal="true"
                            aria-label="Suggest a new book"
                        >
                            <div className="bg-surface rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
                                <div className="p-4 border-b border-border flex justify-between items-center shrink-0">
                                    <h2 className="text-lg font-semibold">
                                        {modalStep === 'search' &&
                                            'Search for a book'}
                                        {modalStep === 'results' &&
                                            'Select a book'}
                                        {modalStep === 'review' &&
                                            'Review your suggestion'}
                                        {modalStep === 'success' &&
                                            'Suggestion received!'}
                                    </h2>
                                    {modalStep !== 'success' && (
                                        <button
                                            type="button"
                                            onClick={closeModal}
                                            className="rounded p-1 -m-1 hover:bg-[var(--surface-hover)]"
                                            aria-label="Close"
                                        >
                                            ×
                                        </button>
                                    )}
                                </div>
                                <div className="p-4 overflow-y-auto flex-1 min-h-0">
                                    {modalStep === 'search' && (
                                        <form
                                            onSubmit={handleSearch}
                                            className="space-y-3"
                                        >
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                <input
                                                    type="text"
                                                    value={titleSearch}
                                                    onChange={(e) =>
                                                        setTitleSearch(
                                                            e.target.value,
                                                        )
                                                    }
                                                    placeholder="Title"
                                                    className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                                                />
                                                <input
                                                    type="text"
                                                    value={authorSearch}
                                                    onChange={(e) =>
                                                        setAuthorSearch(
                                                            e.target.value,
                                                        )
                                                    }
                                                    placeholder="Author"
                                                    className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                                                />
                                            </div>
                                            {searchError && (
                                                <p className="text-sm text-red-600 dark:text-red-400">
                                                    {searchError}
                                                </p>
                                            )}
                                            <button
                                                type="submit"
                                                disabled={
                                                    searchPending ||
                                                    (!titleSearch.trim() &&
                                                        !authorSearch.trim())
                                                }
                                                className="w-full rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium disabled:opacity-50"
                                            >
                                                {searchPending
                                                    ? 'Searching…'
                                                    : 'Search'}
                                            </button>
                                            {searchPending && (
                                                <div className="flex justify-center pt-4">
                                                    <LoadingBookFlip size="sm" />
                                                </div>
                                            )}
                                        </form>
                                    )}
                                    {modalStep === 'results' && (
                                        <div className="space-y-2">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setModalStep('search')
                                                }
                                                className="text-sm text-muted underline hover:no-underline mb-2"
                                            >
                                                ← Back to search
                                            </button>
                                            <ul className="space-y-2 max-h-60 overflow-y-auto">
                                                {searchResults.map((book) => (
                                                    <li
                                                        key={book.externalId}
                                                        className="flex gap-3 rounded-lg border border-border p-3 items-center"
                                                    >
                                                        {book.coverUrl && (
                                                            <div className="relative w-12 h-[72px] shrink-0 rounded overflow-hidden bg-[var(--border)]">
                                                                <Image
                                                                    src={
                                                                        book.coverUrl
                                                                    }
                                                                    alt=""
                                                                    fill
                                                                    className="object-cover"
                                                                    unoptimized
                                                                    sizes="48px"
                                                                />
                                                            </div>
                                                        )}
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-medium text-sm truncate">
                                                                {book.title}
                                                            </p>
                                                            <p className="text-xs text-muted truncate">
                                                                by {book.author}
                                                            </p>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                handleSelectBook(
                                                                    book,
                                                                )
                                                            }
                                                            className="shrink-0 rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-xs font-medium"
                                                        >
                                                            Select book
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                    {modalStep === 'review' && selectedBook && (
                                        <div className="space-y-4">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setModalStep('results')
                                                }
                                                className="text-sm text-muted underline hover:no-underline"
                                            >
                                                ← Back
                                            </button>
                                            {selectedBook.coverOptions &&
                                                selectedBook.coverOptions
                                                    .length > 1 && (
                                                    <div>
                                                        <label className="text-xs font-medium text-muted block mb-1">
                                                            Thumbnail options
                                                        </label>
                                                        <select
                                                            value={
                                                                selectedBook.selectedCoverIndex
                                                            }
                                                            onChange={(e) =>
                                                                updateReviewBook(
                                                                    'selectedCoverIndex',
                                                                    Number(
                                                                        e.target
                                                                            .value,
                                                                    ),
                                                                )
                                                            }
                                                            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                                                        >
                                                            {selectedBook.coverOptions.map(
                                                                (_, i) => (
                                                                    <option
                                                                        key={i}
                                                                        value={
                                                                            i
                                                                        }
                                                                    >
                                                                        Option{' '}
                                                                        {i + 1}
                                                                    </option>
                                                                ),
                                                            )}
                                                        </select>
                                                    </div>
                                                )}
                                            <div>
                                                <label className="text-xs font-medium text-muted block mb-1">
                                                    Manual thumbnail URL
                                                    override
                                                </label>
                                                <input
                                                    type="url"
                                                    value={
                                                        selectedBook.manualOverride ??
                                                        ''
                                                    }
                                                    onChange={(e) =>
                                                        updateReviewBook(
                                                            'manualOverride',
                                                            e.target.value.trim() ||
                                                                null,
                                                        )
                                                    }
                                                    placeholder="https://…"
                                                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                                                />
                                            </div>
                                            {getEffectiveCoverUrl(
                                                selectedBook,
                                            ) && (
                                                <div className="relative w-full max-w-[160px] aspect-[3/4] rounded overflow-hidden bg-[var(--border)]">
                                                    <Image
                                                        src={
                                                            getEffectiveCoverUrl(
                                                                selectedBook,
                                                            )!
                                                        }
                                                        alt=""
                                                        fill
                                                        className="object-cover"
                                                        unoptimized
                                                        sizes="160px"
                                                    />
                                                </div>
                                            )}
                                            <div>
                                                <label className="text-xs font-medium text-muted block mb-1">
                                                    Title
                                                </label>
                                                <input
                                                    type="text"
                                                    value={selectedBook.title}
                                                    onChange={(e) =>
                                                        updateReviewBook(
                                                            'title',
                                                            e.target.value,
                                                        )
                                                    }
                                                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-medium text-muted block mb-1">
                                                    Author
                                                </label>
                                                <input
                                                    type="text"
                                                    value={selectedBook.author}
                                                    onChange={(e) =>
                                                        updateReviewBook(
                                                            'author',
                                                            e.target.value,
                                                        )
                                                    }
                                                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                                                />
                                            </div>
                                            {selectedBook.blurb && (
                                                <div>
                                                    <label className="text-xs font-medium text-muted block mb-1">
                                                        Description
                                                    </label>
                                                    <div
                                                        className="text-sm prose prose-sm dark:prose-invert max-w-none rounded-lg border border-border p-3 bg-[var(--surface)]"
                                                        dangerouslySetInnerHTML={{
                                                            __html: sanitiseBlurb(
                                                                selectedBook.blurb,
                                                            ),
                                                        }}
                                                    />
                                                </div>
                                            )}
                                            {suggestError && (
                                                <p
                                                    className="text-sm text-red-600 dark:text-red-400"
                                                    role="alert"
                                                >
                                                    {suggestError}
                                                </p>
                                            )}
                                            <div className="flex gap-3 pt-2">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setModalStep('results')
                                                    }
                                                    className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-[var(--surface-hover)]"
                                                >
                                                    Back
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={
                                                        handleSuggestNewBook
                                                    }
                                                    disabled={suggestPending}
                                                    className="flex-1 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium disabled:opacity-50"
                                                >
                                                    {suggestPending
                                                        ? 'Submitting…'
                                                        : 'Suggest this book'}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                    {modalStep === 'success' && (
                                        <div className="space-y-4 text-center py-4">
                                            <p className="text-foreground font-medium">
                                                Suggestion received!
                                            </p>
                                            <div className="flex flex-col sm:flex-row gap-2 justify-center">
                                                {userSuggestionCount <
                                                    MAX_SUGGESTIONS_PER_PERSON && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setModalStep(
                                                                'search',
                                                            );
                                                            setSuggestSuccess(
                                                                false,
                                                            );
                                                            setSearchResults(
                                                                [],
                                                            );
                                                        }}
                                                        className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-[var(--primary-hover)]"
                                                    >
                                                        Suggest another book
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={closeModal}
                                                    className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-[var(--surface-hover)]"
                                                >
                                                    View all suggestions
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </LoadingMinDuration>
    );
}
