'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { BackArrowIcon } from '@/components/back-arrow-icon';
import { BookCoverImage } from '@/components/book-cover-image';
import { EventbriteForm } from '@/components/eventbrite-form';

type VoteBook = {
    externalId: string;
    title: string;
    author: string;
    coverUrl: string | null;
    coverOptions: string[];
    blurb: string | null;
    link: string | null;
    voteCount: number;
};

type SearchBook = {
    externalId: string;
    title: string;
    author: string;
    coverUrl: string | null;
    coverOptions: string[];
    blurb: string | null;
    link: string | null;
};

type ReviewBook = {
    externalId: string;
    title: string;
    author: string;
    coverUrl: string | null;
    coverOptions: string[];
    manualOverride: string | null;
    selectedCoverIndex: number;
    blurb: string | null;
};

function getEffectiveCoverUrl(book: ReviewBook): string | null {
    if (book.manualOverride?.trim()) return book.manualOverride.trim();
    if (
        book.coverOptions?.length &&
        book.selectedCoverIndex >= 0 &&
        book.selectedCoverIndex < book.coverOptions.length
    ) {
        return book.coverOptions[book.selectedCoverIndex] ?? null;
    }
    return book.coverUrl;
}

export default function BookOfTheMonthPage() {
    const [stage, setStage] = useState<
        'select' | 'review' | 'confirmed' | 'eventbrite-form'
    >('select');
    const [voteRound, setVoteRound] = useState<{
        id: number;
        meetingDate: string;
    } | null>(null);
    const [voteBooks, setVoteBooks] = useState<VoteBook[]>([]);
    const [voteBooksLoading, setVoteBooksLoading] = useState(true);
    const [titleSearch, setTitleSearch] = useState('');
    const [authorSearch, setAuthorSearch] = useState('');
    const [searchResults, setSearchResults] = useState<SearchBook[]>([]);
    const [searchPending, setSearchPending] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);
    const [selectedBook, setSelectedBook] = useState<ReviewBook | null>(null);
    const [meetingDate, setMeetingDate] = useState('');
    const [confirmPending, setConfirmPending] = useState(false);
    const [confirmError, setConfirmError] = useState<string | null>(null);

    function getDefaultMeetingDate(): string {
        const d = new Date();
        const nextMonth = d.getMonth() + 1;
        const year = nextMonth > 11 ? d.getFullYear() + 1 : d.getFullYear();
        const month = nextMonth > 11 ? nextMonth - 12 : nextMonth;
        const m = String(month + 1).padStart(2, '0');
        return `${year}-${m}-15`;
    }

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setVoteBooksLoading(true);
            try {
                const res = await fetch('/api/admin/latest-vote-books', {
                    credentials: 'include',
                });
                const data = await res.json().catch(() => ({}));
                if (cancelled) return;
                if (!res.ok) {
                    setVoteBooks([]);
                    setVoteRound(null);
                    return;
                }
                setVoteRound(data.round ?? null);
                setVoteBooks(data.books ?? []);
            } finally {
                if (!cancelled) setVoteBooksLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

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

    const selectVoteBook = useCallback(
        (book: VoteBook) => {
            const coverOptions =
                book.coverOptions ?? (book.coverUrl ? [book.coverUrl] : []);
            const selectedCoverIndex =
                coverOptions.length > 0 ? coverOptions.length - 1 : 0;
            setSelectedBook({
                externalId: book.externalId,
                title: book.title,
                author: book.author,
                coverUrl: book.coverUrl,
                coverOptions,
                manualOverride: null,
                selectedCoverIndex,
                blurb: book.blurb,
            });
            setMeetingDate(voteRound?.meetingDate ?? getDefaultMeetingDate());
            setStage('review');
        },
        [voteRound?.meetingDate],
    );

    const selectSearchBook = useCallback((book: SearchBook) => {
        const opts = book.coverOptions ?? (book.coverUrl ? [book.coverUrl] : []);
        const selectedCoverIndex =
            opts.length > 0 ? opts.length - 1 : 0;
        setSelectedBook({
            externalId: book.externalId,
            title: book.title,
            author: book.author,
            coverUrl: book.coverUrl,
            coverOptions: opts,
            manualOverride: null,
            selectedCoverIndex,
            blurb: book.blurb,
        });
        setMeetingDate(getDefaultMeetingDate());
        setStage('review');
    }, []);

    const updateReviewBook = useCallback(
        <K extends keyof ReviewBook>(field: K, value: ReviewBook[K]) => {
            setSelectedBook((prev) =>
                prev ? { ...prev, [field]: value } : null,
            );
        },
        [],
    );

    const backToSelect = useCallback(() => {
        setStage('select');
        setSelectedBook(null);
    }, []);

    const handleConfirm = useCallback(async () => {
        if (!selectedBook) return;
        setConfirmPending(true);
        setConfirmError(null);
        try {
            const res = await fetch('/api/admin/book-of-the-month', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    meetingDate,
                    externalId: selectedBook.externalId,
                    title: selectedBook.title,
                    author: selectedBook.author,
                    coverUrl: getEffectiveCoverUrl(selectedBook) ?? selectedBook.coverUrl,
                    blurb: selectedBook.blurb,
                    link: null,
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setConfirmError(data.error ?? 'Failed to set book');
                return;
            }
            setStage('confirmed');
        } catch {
            setConfirmError('Network error');
        } finally {
            setConfirmPending(false);
        }
    }, [selectedBook, meetingDate]);

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
                <h1 className="font-heading text-xl font-semibold">
                    Set book of the month
                </h1>
            </header>

            <main className="max-w-lg mx-auto p-6">
                {stage === 'select' && (
                    <div className="space-y-8">
                        {/* Results from latest vote - only if there was a vote */}
                        {!voteBooksLoading && voteBooks.length > 0 && (
                            <section>
                                <h2 className="text-lg font-semibold text-foreground mb-3">
                                    Results from latest vote
                                </h2>
                                <ul className="space-y-2">
                                    {voteBooks.map((book) => (
                                        <li
                                            key={book.externalId}
                                            className="flex gap-3 rounded-lg border border-border bg-surface p-3 items-center"
                                        >
                                            <div className="w-12 h-[72px] shrink-0 rounded overflow-hidden">
                                                <BookCoverImage
                                                    src={book.coverUrl}
                                                    containerClassName="w-full h-full"
                                                    sizes="48px"
                                                />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-sm truncate">
                                                    {book.title}
                                                </p>
                                                <p className="text-xs text-muted truncate">
                                                    by {book.author}
                                                </p>
                                                <p className="text-xs text-muted mt-0.5">
                                                    {book.voteCount}{' '}
                                                    {book.voteCount === 1
                                                        ? 'vote'
                                                        : 'votes'}
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    selectVoteBook(book)
                                                }
                                                className="shrink-0 rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-xs font-medium hover:bg-[var(--primary-hover)]"
                                            >
                                                Select book
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        )}

                        {voteBooksLoading && (
                            <p className="text-sm text-muted">Loading…</p>
                        )}

                        {/* Or set manually */}
                        <section>
                            <h2 className="text-lg font-semibold text-foreground mb-3">
                                Or set manually
                            </h2>
                            <form
                                onSubmit={handleSearch}
                                className="space-y-3 mb-4"
                            >
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <input
                                        type="text"
                                        value={titleSearch}
                                        onChange={(e) =>
                                            setTitleSearch(e.target.value)
                                        }
                                        placeholder="Title"
                                        className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                                    />
                                    <input
                                        type="text"
                                        value={authorSearch}
                                        onChange={(e) =>
                                            setAuthorSearch(e.target.value)
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
                                    className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium disabled:opacity-50"
                                >
                                    {searchPending ? 'Searching…' : 'Search'}
                                </button>
                            </form>
                            {searchResults.length > 0 && (
                                <ul className="space-y-2">
                                    {searchResults.map((book) => (
                                        <li
                                            key={book.externalId}
                                            className="flex gap-3 rounded-lg border border-border bg-surface p-3 items-center"
                                        >
                                            <div className="w-12 h-[72px] shrink-0 rounded overflow-hidden">
                                                <BookCoverImage
                                                    src={book.coverUrl}
                                                    containerClassName="w-full h-full"
                                                    sizes="48px"
                                                />
                                            </div>
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
                                                    selectSearchBook(book)
                                                }
                                                className="shrink-0 rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-xs font-medium hover:bg-[var(--primary-hover)]"
                                            >
                                                Select book
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>
                    </div>
                )}

                {stage === 'review' && selectedBook && (
                    <div className="space-y-4">
                        <button
                            type="button"
                            onClick={backToSelect}
                            className="inline-flex items-center gap-1.5 text-sm text-muted underline hover:no-underline"
                        >
                            <BackArrowIcon className="size-4 shrink-0" />
                            Back
                        </button>
                        <h2 className="text-lg font-semibold">Review</h2>

                        {/* Thumbnail first, then override controls */}
                        <div>
                            <div className="relative w-full max-w-[160px] aspect-[3/4] rounded overflow-hidden mb-3">
                                <BookCoverImage
                                    src={getEffectiveCoverUrl(selectedBook) ?? undefined}
                                    containerClassName="absolute inset-0"
                                    sizes="160px"
                                />
                            </div>
                            <label className="text-xs font-medium text-muted block mb-1">
                                Thumbnail
                            </label>
                            {selectedBook.coverOptions.length > 1 && (
                                <div className="mb-2">
                                    <select
                                        value={selectedBook.selectedCoverIndex}
                                        onChange={(e) =>
                                            updateReviewBook(
                                                'selectedCoverIndex',
                                                Number(e.target.value),
                                            )
                                        }
                                        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                                    >
                                        {selectedBook.coverOptions.map(
                                            (_, i) => (
                                                <option key={i} value={i}>
                                                    Option {i + 1}
                                                </option>
                                            ),
                                        )}
                                    </select>
                                </div>
                            )}
                            <input
                                type="url"
                                value={selectedBook.manualOverride ?? ''}
                                onChange={(e) =>
                                    updateReviewBook(
                                        'manualOverride',
                                        e.target.value.trim() || null,
                                    )
                                }
                                placeholder="Override thumbnail URL (optional)"
                                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-medium text-muted block mb-1">
                                Title
                            </label>
                            <input
                                type="text"
                                value={selectedBook.title}
                                onChange={(e) =>
                                    updateReviewBook('title', e.target.value)
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
                                    updateReviewBook('author', e.target.value)
                                }
                                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-medium text-muted block mb-1">
                                Meeting date
                            </label>
                            <input
                                type="date"
                                value={meetingDate}
                                onChange={(e) =>
                                    setMeetingDate(e.target.value)
                                }
                                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                                required
                            />
                        </div>

                        {confirmError && (
                            <p className="text-sm text-red-600 dark:text-red-400">
                                {confirmError}
                            </p>
                        )}
                        <button
                            type="button"
                            onClick={handleConfirm}
                            disabled={confirmPending}
                            className="w-full rounded-lg bg-primary text-primary-foreground px-4 py-3 text-sm font-medium hover:bg-[var(--primary-hover)] disabled:opacity-50"
                        >
                            {confirmPending ? 'Saving…' : 'Confirm'}
                        </button>
                    </div>
                )}

                {stage === 'confirmed' && selectedBook && (
                    <div className="space-y-4">
                        <div className="rounded-lg border border-border bg-surface p-4 text-center">
                            <p className="text-lg font-semibold text-foreground">
                                Book set successfully
                            </p>
                            <p className="text-sm text-muted mt-1">
                                {selectedBook.title} by {selectedBook.author}
                            </p>
                            <button
                                type="button"
                                onClick={() => setStage('eventbrite-form')}
                                className="mt-4 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-[var(--primary-hover)]"
                            >
                                Create event on Eventbrite
                            </button>
                        </div>
                    </div>
                )}

                {stage === 'eventbrite-form' && selectedBook && (
                    <EventbriteForm
                        bookTitle={selectedBook.title}
                        bookAuthor={selectedBook.author}
                        meetingDate={meetingDate || undefined}
                        onBack={() => setStage('confirmed')}
                        showBackButton
                    />
                )}
            </main>
        </div>
    );
}
