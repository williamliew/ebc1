'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import Link from 'next/link';
import { BackArrowIcon } from '@/components/back-arrow-icon';
import { sanitiseBlurb } from '@/lib/sanitize-blurb';
import { LoadingBookFlip } from '@/components/loading-book-flip';
import { BookCoverImage } from '@/components/book-cover-image';
import { CloseIcon } from '@/components/close-icon';

const SWIPE_THRESHOLD = 50;
const SWIPE_TRANSITION_MS = 280;

type BookSearchResult = {
    externalId: string;
    title: string;
    author: string;
    coverUrl: string | null;
    coverOptions?: string[];
    blurb: string | null;
    link: string | null;
};

/** Book in review step: adds thumbnail selection state. */
type ReviewBook = BookSearchResult & {
    coverOptions: string[];
    selectedCoverIndex: number;
    manualOverride: string | null;
};

function getEffectiveCoverUrl(book: ReviewBook): string | null {
    if (book.manualOverride != null && book.manualOverride.trim() !== '') {
        return book.manualOverride.trim();
    }
    if (
        book.coverOptions.length > 0 &&
        book.selectedCoverIndex >= 0 &&
        book.selectedCoverIndex < book.coverOptions.length
    ) {
        return book.coverOptions[book.selectedCoverIndex] ?? null;
    }
    return book.coverUrl;
}

const MAX_SELECTED = 4;
const MIN_TO_CREATE = 2;

function getDefaultMeetingDate(): string {
    const d = new Date();
    const nextMonth = d.getMonth() + 1;
    const year = nextMonth > 11 ? d.getFullYear() + 1 : d.getFullYear();
    const month = nextMonth > 11 ? nextMonth - 12 : nextMonth;
    const day = 15;
    const m = String(month + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    return `${year}-${m}-${dayStr}`;
}

function getTomorrowDate(): string {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function getDefaultCloseVoteDate(meetingDate: string): string {
    const meeting = new Date(meetingDate + 'T12:00:00');
    const close = new Date(meeting);
    close.setDate(close.getDate() - 7);
    const y = close.getFullYear();
    const m = String(close.getMonth() + 1).padStart(2, '0');
    const day = String(close.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

export default function VotingBuilderPage() {
    const [titleSearch, setTitleSearch] = useState('');
    const [authorSearch, setAuthorSearch] = useState('');
    const defaultMeeting = getDefaultMeetingDate();
    const [meetingDate, setMeetingDate] = useState(defaultMeeting);
    const [closeVoteDate, setCloseVoteDate] = useState(getTomorrowDate);
    const [voteAccessPassword, setVoteAccessPassword] = useState('');
    const [searchResults, setSearchResults] = useState<BookSearchResult[]>([]);
    const [searchPage, setSearchPage] = useState(1);
    const [totalSearchItems, setTotalSearchItems] = useState(0);
    const [selected, setSelected] = useState<BookSearchResult[]>([]);
    const [searchError, setSearchError] = useState<string | null>(null);
    const [createMessage, setCreateMessage] = useState<{
        type: 'success' | 'error';
        text: string;
    } | null>(null);
    const [showSuccessLightbox, setShowSuccessLightbox] = useState(false);
    const [previewBook, setPreviewBook] = useState<BookSearchResult | null>(
        null,
    );
    const [step, setStep] = useState<'builder' | 'review'>('builder');
    const [reviewBooks, setReviewBooks] = useState<ReviewBook[]>([]);
    const [reviewModalStep, setReviewModalStep] = useState<'books' | 'details'>(
        'books',
    );
    const [reviewIndex, setReviewIndex] = useState(0);
    const [reviewDragOffset, setReviewDragOffset] = useState(0);
    const [reviewIsDragging, setReviewIsDragging] = useState(false);
    const reviewPointerStartRef = useRef<number | null>(null);
    const queryClient = useQueryClient();

    const PAGE_SIZE = 10;

    type LatestVoteBook = BookSearchResult & { voteCount: number };

    const { data: latestVoteData } = useQuery({
        queryKey: ['admin', 'latest-vote-books'],
        queryFn: async () => {
            const res = await fetch('/api/admin/latest-vote-books', {
                credentials: 'include',
            });
            if (!res.ok) return { round: null, books: [] };
            return res.json() as Promise<{
                round: { id: number; meetingDate: string } | null;
                books: LatestVoteBook[];
            }>;
        },
    });

    const latestVoteBooks = latestVoteData?.books ?? [];

    const searchMutation = useMutation({
        mutationFn: async ({
            title,
            author,
            page = 1,
        }: {
            title: string;
            author: string;
            page?: number;
        }) => {
            const res = await fetch('/api/books/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, author, page }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error ?? 'Search failed');
            }
            return res.json() as Promise<{
                results: BookSearchResult[];
                totalItems: number;
                page: number;
                pageSize: number;
            }>;
        },
        onSuccess: (data) => {
            setSearchResults(data.results);
            setSearchPage(data.page);
            setTotalSearchItems(data.totalItems);
            setSearchError(null);
        },
        onError: (err) => {
            setSearchError(
                err instanceof Error ? err.message : 'Search failed',
            );
            setSearchResults([]);
        },
    });

    const createMutation = useMutation({
        mutationFn: async ({
            meetingDate: date,
            closeVoteDate: closeDate,
            voteAccessPassword: accessPassword,
            books,
        }: {
            meetingDate: string;
            closeVoteDate: string;
            voteAccessPassword: string;
            books: BookSearchResult[];
        }) => {
            const res = await fetch('/api/nomination', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    meetingDate: date,
                    closeVoteDate: closeDate,
                    voteAccessPassword: accessPassword.trim() || undefined,
                    books: books.map((b) => ({
                        externalId: b.externalId,
                        title: b.title,
                        author: b.author,
                        coverUrl: getEffectiveCoverUrl(b as ReviewBook) ?? null,
                    })),
                }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error ?? 'Failed to create round');
            }
            return res.json();
        },
        onSuccess: () => {
            setShowSuccessLightbox(true);
            setCreateMessage(null);
            setSelected([]);
            setReviewBooks([]);
            setStep('builder');
            setTitleSearch('');
            setAuthorSearch('');
            setVoteAccessPassword('');
            setSearchResults([]);
            setSearchError(null);
            queryClient.invalidateQueries({ queryKey: ['nomination'] });
        },
        onError: (err) => {
            setCreateMessage({
                type: 'error',
                text:
                    err instanceof Error
                        ? err.message
                        : 'Failed to create round',
            });
        },
    });

    const handleSearch = useCallback(
        (e: React.FormEvent) => {
            e.preventDefault();
            const title = titleSearch.trim();
            const author = authorSearch.trim();
            if (!title && !author) return;
            searchMutation.mutate({ title, author, page: 1 });
        },
        [titleSearch, authorSearch, searchMutation],
    );

    const MAX_PAGES = 10;
    const effectiveTotal = Math.min(totalSearchItems, MAX_PAGES * PAGE_SIZE);
    const totalSearchPages = Math.max(1, Math.ceil(effectiveTotal / PAGE_SIZE));
    const showPagination = searchResults.length > 0 && totalSearchPages > 1;
    const canPrev = showPagination && searchPage > 1;
    const canNext = showPagination && searchPage < totalSearchPages;

    const selectedIds = useMemo(
        () => new Set(selected.map((b) => b.externalId)),
        [selected],
    );

    const addSelected = useCallback((book: BookSearchResult) => {
        setSelected((prev) => {
            if (prev.length >= MAX_SELECTED) return prev;
            if (prev.some((b) => b.externalId === book.externalId)) return prev;
            return [...prev, book];
        });
    }, []);

    const removeSelected = useCallback((externalId: string) => {
        setSelected((prev) => prev.filter((b) => b.externalId !== externalId));
    }, []);

    const reset = useCallback(() => {
        setSelected([]);
        setCreateMessage(null);
    }, []);

    const goToReview = useCallback(() => {
        if (selected.length < MIN_TO_CREATE) return;
        setReviewBooks(
            selected.map((b) => {
                const opts = b.coverOptions ?? [];
                const matchIndex =
                    opts.length > 0 && b.coverUrl
                        ? opts.indexOf(b.coverUrl)
                        : -1;
                const selectedCoverIndex =
                    matchIndex >= 0 ? matchIndex : Math.max(0, opts.length - 1);
                return {
                    ...b,
                    coverOptions: opts,
                    selectedCoverIndex,
                    manualOverride: null,
                };
            }),
        );
        setReviewIndex(0);
        setReviewModalStep('books');
        setStep('review');
    }, [selected]);

    const goBackFromReview = useCallback(() => {
        setStep('builder');
    }, []);

    const createFromReview = useCallback(() => {
        if (reviewBooks.length < MIN_TO_CREATE) return;
        createMutation.mutate({
            meetingDate,
            closeVoteDate,
            voteAccessPassword,
            books: reviewBooks,
        });
    }, [
        reviewBooks,
        meetingDate,
        closeVoteDate,
        voteAccessPassword,
        createMutation,
    ]);

    const updateReviewBook = useCallback(
        (
            index: number,
            field: keyof ReviewBook,
            value: string | null | number,
        ) => {
            setReviewBooks((prev) => {
                const next = [...prev];
                const book = next[index];
                if (!book) return prev;
                next[index] = { ...book, [field]: value };
                return next;
            });
        },
        [],
    );

    const reviewGoTo = useCallback(
        (index: number) => {
            const next = Math.max(0, Math.min(index, reviewBooks.length - 1));
            setReviewIndex(next);
        },
        [reviewBooks.length],
    );

    const reviewHandlePointerStart = useCallback(
        (clientX: number) => {
            if (reviewBooks.length <= 1) return;
            reviewPointerStartRef.current = clientX;
            setReviewIsDragging(true);
            setReviewDragOffset(0);
        },
        [reviewBooks.length],
    );

    const reviewHandlePointerMove = useCallback((clientX: number) => {
        const startX = reviewPointerStartRef.current;
        if (startX === null) return;
        setReviewDragOffset(clientX - startX);
    }, []);

    const reviewHandlePointerEnd = useCallback(
        (clientX: number) => {
            const startX = reviewPointerStartRef.current;
            reviewPointerStartRef.current = null;
            setReviewIsDragging(false);
            if (startX === null || reviewBooks.length <= 1) {
                setReviewDragOffset(0);
                return;
            }
            const delta = startX - clientX;
            if (delta > SWIPE_THRESHOLD) reviewGoTo(reviewIndex + 1);
            else if (delta < -SWIPE_THRESHOLD) reviewGoTo(reviewIndex - 1);
            setReviewDragOffset(0);
        },
        [reviewIndex, reviewBooks.length, reviewGoTo],
    );

    const reviewHandleTouchStart = useCallback(
        (e: React.TouchEvent) => {
            const target = e.target;
            if (
                target instanceof HTMLInputElement ||
                target instanceof HTMLTextAreaElement ||
                target instanceof HTMLSelectElement ||
                target instanceof HTMLLabelElement
            ) {
                return;
            }
            reviewHandlePointerStart(e.targetTouches[0].clientX);
        },
        [reviewHandlePointerStart],
    );
    const reviewHandleTouchMove = useCallback(
        (e: React.TouchEvent) => {
            reviewHandlePointerMove(e.targetTouches[0].clientX);
        },
        [reviewHandlePointerMove],
    );
    const reviewHandleTouchEnd = useCallback(
        (e: React.TouchEvent) => {
            reviewHandlePointerEnd(e.changedTouches[0].clientX);
        },
        [reviewHandlePointerEnd],
    );
    const reviewHandleMouseDown = useCallback(
        (e: React.MouseEvent) => {
            const target = e.target;
            if (
                target instanceof HTMLInputElement ||
                target instanceof HTMLTextAreaElement ||
                target instanceof HTMLSelectElement ||
                target instanceof HTMLLabelElement
            ) {
                return;
            }
            e.preventDefault();
            reviewHandlePointerStart(e.clientX);
        },
        [reviewHandlePointerStart],
    );

    useEffect(() => {
        if (!reviewIsDragging) return;
        const onMouseMove = (e: MouseEvent) =>
            reviewHandlePointerMove(e.clientX);
        const onMouseUp = (e: MouseEvent) => {
            reviewHandlePointerEnd(e.clientX);
        };
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
    }, [reviewIsDragging, reviewHandlePointerMove, reviewHandlePointerEnd]);

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
                    Create a vote
                </h1>
                <p className="text-sm text-muted mt-1">
                    Search books, select up to {MAX_SELECTED}, then create the
                    nomination round (min {MIN_TO_CREATE} books).
                </p>
            </header>

            <main
                className={`w-full max-w-2xl mx-auto p-4 space-y-6 ${selected.length >= 1 ? 'pb-80' : ''}`}
            >
                {/* Latest suggestion round */}
                {latestVoteBooks.length > 0 && (
                    <section>
                        <h2 className="text-sm font-medium text-muted dark:text-muted mb-2">
                            Latest suggestion round
                        </h2>
                        <ul className="space-y-3">
                            {latestVoteBooks.map((book) => {
                                const alreadySelected = selectedIds.has(
                                    book.externalId,
                                );
                                const atMax = selected.length >= MAX_SELECTED;
                                return (
                                    <li
                                        key={book.externalId}
                                        className="flex gap-3 rounded-lg border border-border bg-surface p-3"
                                    >
                                        <div className="flex-shrink-0 w-12 h-18 rounded overflow-hidden">
                                            <BookCoverImage
                                                src={book.coverUrl}
                                                containerClassName="w-full h-full"
                                                sizes="48px"
                                            />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="font-medium text-sm truncate">
                                                {book.title}
                                            </p>
                                            <p className="text-xs text-muted truncate">
                                                {book.author}
                                            </p>
                                            <p className="text-xs text-muted">
                                                {book.voteCount}{' '}
                                                {book.voteCount === 1
                                                    ? 'vote'
                                                    : 'votes'}
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setPreviewBook(book)
                                                }
                                                className="mt-1 text-xs text-muted hover:underline"
                                            >
                                                Read more
                                            </button>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (alreadySelected) {
                                                    removeSelected(
                                                        book.externalId,
                                                    );
                                                } else {
                                                    addSelected(book);
                                                }
                                            }}
                                            disabled={!alreadySelected && atMax}
                                            className="flex-shrink-0 rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-xs font-medium hover:bg-[var(--primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {alreadySelected
                                                ? 'Remove'
                                                : 'Select'}
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    </section>
                )}

                {/* Search */}
                <section className="w-full">
                    <form
                        onSubmit={handleSearch}
                        className="w-full flex flex-col sm:flex-row gap-2"
                    >
                        <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div className="relative">
                                <input
                                    type="text"
                                    value={titleSearch}
                                    onChange={(e) =>
                                        setTitleSearch(e.target.value)
                                    }
                                    placeholder="Title"
                                    className="rounded-lg border border-border bg-surface pl-3 pr-8 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                                    aria-label="Book title"
                                />
                                {titleSearch && (
                                    <button
                                        type="button"
                                        onClick={() => setTitleSearch('')}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded text-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                                        aria-label="Clear title"
                                    >
                                        ×
                                    </button>
                                )}
                            </div>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={authorSearch}
                                    onChange={(e) =>
                                        setAuthorSearch(e.target.value)
                                    }
                                    placeholder="Author"
                                    className="rounded-lg border border-border bg-surface pl-3 pr-8 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                                    aria-label="Author"
                                />
                                {authorSearch && (
                                    <button
                                        type="button"
                                        onClick={() => setAuthorSearch('')}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded text-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                                        aria-label="Clear author"
                                    >
                                        ×
                                    </button>
                                )}
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={
                                searchMutation.isPending ||
                                (!titleSearch.trim() && !authorSearch.trim())
                            }
                            className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-[var(--primary-hover)] disabled:opacity-50 shrink-0"
                        >
                            {searchMutation.isPending ? 'Searching…' : 'Search'}
                        </button>
                    </form>
                    {searchError && (
                        <p
                            className="mt-2 text-sm text-red-600 dark:text-red-400"
                            role="alert"
                        >
                            {searchError}
                        </p>
                    )}
                </section>

                {/* Searching: show book flip while search is in progress */}
                {searchMutation.isPending && (
                    <section className="flex justify-center py-8">
                        <LoadingBookFlip size="sm" />
                    </section>
                )}

                {/* Search results */}
                {searchResults.length > 0 && (
                    <section>
                        <h2 className="text-sm font-medium text-muted dark:text-muted mb-2">
                            Results
                        </h2>
                        <ul className="space-y-3">
                            {searchResults.map((book) => {
                                const alreadySelected = selectedIds.has(
                                    book.externalId,
                                );
                                const atMax = selected.length >= MAX_SELECTED;
                                return (
                                    <li
                                        key={book.externalId}
                                        className="flex gap-3 rounded-lg border border-border bg-surface p-3"
                                    >
                                        <div className="flex-shrink-0 w-12 h-18 rounded overflow-hidden">
                                            <BookCoverImage
                                                src={book.coverUrl}
                                                containerClassName="w-full h-full"
                                                sizes="48px"
                                            />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="font-medium text-sm truncate">
                                                {book.title}
                                            </p>
                                            <p className="text-xs text-muted truncate">
                                                {book.author}
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setPreviewBook(book)
                                                }
                                                className="mt-1 text-xs text-muted hover:underline"
                                            >
                                                Read more
                                            </button>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (alreadySelected) {
                                                    removeSelected(
                                                        book.externalId,
                                                    );
                                                } else {
                                                    addSelected(book);
                                                }
                                            }}
                                            disabled={!alreadySelected && atMax}
                                            className="flex-shrink-0 rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-xs font-medium hover:bg-[var(--primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {alreadySelected
                                                ? 'Remove'
                                                : 'Select'}
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                        {showPagination && (
                            <div className="mt-3 flex items-center justify-between gap-2">
                                <button
                                    type="button"
                                    onClick={() =>
                                        searchMutation.mutate({
                                            title: titleSearch.trim(),
                                            author: authorSearch.trim(),
                                            page: searchPage - 1,
                                        })
                                    }
                                    disabled={
                                        !canPrev || searchMutation.isPending
                                    }
                                    className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-[var(--surface-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Previous
                                </button>
                                <span className="text-sm text-muted dark:text-muted">
                                    Page {searchPage} of {totalSearchPages}
                                </span>
                                <button
                                    type="button"
                                    onClick={() =>
                                        searchMutation.mutate({
                                            title: titleSearch.trim(),
                                            author: authorSearch.trim(),
                                            page: searchPage + 1,
                                        })
                                    }
                                    disabled={
                                        !canNext || searchMutation.isPending
                                    }
                                    className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-[var(--surface-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </section>
                )}

                {/* Read more popup */}
                {previewBook && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="preview-title"
                        onClick={() => setPreviewBook(null)}
                    >
                        <div
                            className="rounded-xl bg-surface shadow-xl max-w-md w-full max-h-[85vh] overflow-hidden flex flex-col"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-4 pb-2 flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                    <h3
                                        id="preview-title"
                                        className="text-lg font-semibold text-foreground"
                                    >
                                        {previewBook.title}
                                    </h3>
                                    <p className="text-sm text-muted dark:text-muted mt-0.5">
                                        by {previewBook.author}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setPreviewBook(null)}
                                    className="flex-shrink-0 rounded p-1.5 text-muted hover:bg-[var(--surface-hover)] hover:text-foreground"
                                    aria-label="Close"
                                >
                                    <CloseIcon className="h-5 w-5" />
                                </button>
                            </div>
                            <div className="px-4 pb-4 overflow-y-auto flex-1 min-h-0">
                                {previewBook.blurb ? (
                                    <div
                                        className="text-sm text-muted leading-relaxed [&_p]:my-1 [&_a]:underline [&_a]:text-foreground"
                                        dangerouslySetInnerHTML={{
                                            __html: sanitiseBlurb(
                                                previewBook.blurb,
                                            ),
                                        }}
                                    />
                                ) : (
                                    <p className="text-sm text-muted dark:text-muted italic">
                                        No description available.
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {createMessage && createMessage.type === 'error' && (
                    <p
                        role="alert"
                        className="text-sm text-red-600 dark:text-red-400"
                    >
                        {createMessage.text}
                    </p>
                )}
            </main>

            {/* Success lightbox */}
            {showSuccessLightbox && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="success-lightbox-title"
                >
                    <div className="rounded-xl bg-surface shadow-xl p-6 max-w-sm w-full text-center">
                        <p
                            id="success-lightbox-title"
                            className="text-lg font-semibold text-foreground"
                        >
                            Vote created!
                        </p>
                        <div className="mt-4 flex flex-col sm:flex-row gap-2 justify-center">
                            <button
                                type="button"
                                onClick={() => setShowSuccessLightbox(false)}
                                className="rounded-lg bg-primary text-primary-foreground p-2.5 text-sm font-medium hover:bg-[var(--primary-hover)] inline-flex items-center justify-center"
                                aria-label="Close"
                            >
                                <CloseIcon className="h-5 w-5" />
                            </button>
                            <Link
                                href="/"
                                onClick={() => setShowSuccessLightbox(false)}
                                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-[var(--surface-hover)] text-center"
                            >
                                Return to home
                            </Link>
                        </div>
                    </div>
                </div>
            )}

            {/* Review modal popup */}
            {step === 'review' && reviewBooks.length > 0 && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="review-modal-title"
                >
                    <div className="relative bg-surface rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden">
                        <div className="p-4 border-b border-border shrink-0">
                            <h2
                                id="review-modal-title"
                                className="text-xl font-semibold"
                            >
                                {reviewModalStep === 'books'
                                    ? 'Review selections'
                                    : 'Meeting & vote details'}
                            </h2>
                            <p className="text-sm text-muted mt-1">
                                {reviewModalStep === 'books'
                                    ? 'Check cover, title and author. Swipe between books.'
                                    : 'Set the meeting date, close vote date and optional password.'}
                            </p>
                        </div>
                        {/* Previous / Next arrows fixed in modal (step 1 only) */}
                        {reviewModalStep === 'books' && reviewIndex > 0 && (
                            <button
                                type="button"
                                onClick={() => reviewGoTo(reviewIndex - 1)}
                                className="absolute left-2 top-1/2 z-20 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-surface border border-border shadow-md text-foreground hover:bg-[var(--surface-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                                aria-label="Previous book"
                            >
                                <BackArrowIcon className="h-5 w-5" />
                            </button>
                        )}
                        {reviewModalStep === 'books' &&
                            reviewIndex < reviewBooks.length - 1 && (
                                <button
                                    type="button"
                                    onClick={() => reviewGoTo(reviewIndex + 1)}
                                    className="absolute right-2 top-1/2 z-20 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-surface border border-border shadow-md text-foreground hover:bg-[var(--surface-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
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
                                        className="h-5 w-5"
                                        aria-hidden
                                    >
                                        <path d="M5 12h14M12 5l7 7-7 7" />
                                    </svg>
                                </button>
                            )}
                        {reviewModalStep === 'books' && (
                            <section
                                className="flex-1 min-h-0 flex flex-col px-4 pt-4 overflow-y-auto select-none"
                                onTouchStart={reviewHandleTouchStart}
                                onTouchMove={reviewHandleTouchMove}
                                onTouchEnd={reviewHandleTouchEnd}
                                onMouseDown={reviewHandleMouseDown}
                                style={{ touchAction: 'pan-y' }}
                            >
                                <div className="flex-1 min-h-0 overflow-y-visible rounded-xl">
                                    <div
                                        className="flex will-change-transform"
                                        style={{
                                            width: `${reviewBooks.length * 100}%`,
                                            transform: `translateX(calc(-${reviewIndex * (100 / reviewBooks.length)}% + ${reviewDragOffset}px))`,
                                            transition: reviewIsDragging
                                                ? 'none'
                                                : `transform ${SWIPE_TRANSITION_MS}ms ease-out`,
                                        }}
                                    >
                                        {reviewBooks.map((book, i) => (
                                            <div
                                                key={book.externalId}
                                                className="flex flex-col flex-shrink-0 min-w-0 pr-4 max-h-[65vh] overflow-y-auto overscroll-contain"
                                                style={{
                                                    width: `${100 / reviewBooks.length}%`,
                                                }}
                                            >
                                                <div className="flex flex-col border border-border bg-surface overflow-x-hidden">
                                                    {getEffectiveCoverUrl(
                                                        book,
                                                    ) ? (
                                                        <div className="relative w-full aspect-[3/4] max-h-[45vh] shrink-0 bg-[var(--border)]">
                                                            <BookCoverImage
                                                                src={
                                                                    getEffectiveCoverUrl(
                                                                        book,
                                                                    ) ?? undefined
                                                                }
                                                                containerClassName="absolute inset-0"
                                                                sizes="(max-width: 512px) 100vw, 512px"
                                                                objectFit="contain"
                                                                objectPosition="top"
                                                                onError={() => {
                                                                    const effective =
                                                                        getEffectiveCoverUrl(
                                                                            book,
                                                                        );
                                                                    const isOverride =
                                                                        book.manualOverride !=
                                                                            null &&
                                                                        book.manualOverride.trim() !==
                                                                            '' &&
                                                                        effective ===
                                                                            book.manualOverride.trim();
                                                                    if (
                                                                        isOverride
                                                                    )
                                                                        updateReviewBook(
                                                                            i,
                                                                            'manualOverride',
                                                                            null,
                                                                        );
                                                                }}
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div className="w-full aspect-[3/4] max-h-[45vh] shrink-0 bg-[var(--border)] flex items-center justify-center">
                                                            <span className="text-muted text-sm">
                                                                No cover
                                                            </span>
                                                        </div>
                                                    )}
                                                    <div className="p-4 pb-10 space-y-3">
                                                        {book.coverOptions
                                                            .length > 1 && (
                                                            <div>
                                                                <label className="text-xs font-medium text-muted block mb-1">
                                                                    Thumbnail
                                                                    options
                                                                </label>
                                                                <select
                                                                    value={
                                                                        book.selectedCoverIndex
                                                                    }
                                                                    onChange={(
                                                                        e,
                                                                    ) =>
                                                                        updateReviewBook(
                                                                            i,
                                                                            'selectedCoverIndex',
                                                                            Number(
                                                                                e
                                                                                    .target
                                                                                    .value,
                                                                            ),
                                                                        )
                                                                    }
                                                                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                                                                >
                                                                    {book.coverOptions.map(
                                                                        (
                                                                            _,
                                                                            optIdx,
                                                                        ) => (
                                                                            <option
                                                                                key={
                                                                                    optIdx
                                                                                }
                                                                                value={
                                                                                    optIdx
                                                                                }
                                                                            >
                                                                                Option{' '}
                                                                                {optIdx +
                                                                                    1}
                                                                            </option>
                                                                        ),
                                                                    )}
                                                                </select>
                                                            </div>
                                                        )}
                                                        <div>
                                                            <label className="text-xs font-medium text-muted block mb-1">
                                                                Manual thumbnail
                                                                URL override
                                                            </label>
                                                            <input
                                                                type="url"
                                                                value={
                                                                    book.manualOverride ??
                                                                    ''
                                                                }
                                                                onChange={(
                                                                    e,
                                                                ) => {
                                                                    const v =
                                                                        e.target.value.trim() ||
                                                                        null;
                                                                    updateReviewBook(
                                                                        i,
                                                                        'manualOverride',
                                                                        v,
                                                                    );
                                                                }}
                                                                placeholder="https://… (overrides thumbnail option)"
                                                                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-xs font-medium text-muted block mb-1">
                                                                Title
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={
                                                                    book.title
                                                                }
                                                                onChange={(e) =>
                                                                    updateReviewBook(
                                                                        i,
                                                                        'title',
                                                                        e.target
                                                                            .value,
                                                                    )
                                                                }
                                                                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-xs font-medium text-muted block mb-1">
                                                                Author
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={
                                                                    book.author
                                                                }
                                                                onChange={(e) =>
                                                                    updateReviewBook(
                                                                        i,
                                                                        'author',
                                                                        e.target
                                                                            .value,
                                                                    )
                                                                }
                                                                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div
                                    className="flex justify-center gap-2 py-4 shrink-0"
                                    role="tablist"
                                    aria-label="Book options"
                                >
                                    {reviewBooks.map((_, i) => (
                                        <button
                                            key={i}
                                            type="button"
                                            onClick={() => reviewGoTo(i)}
                                            role="tab"
                                            aria-selected={i === reviewIndex}
                                            aria-label={`Book ${i + 1} of ${reviewBooks.length}`}
                                            className={`h-2 rounded-full transition-colors ${
                                                i === reviewIndex
                                                    ? 'w-6 bg-primary'
                                                    : 'w-2 bg-[var(--border)] hover:bg-[var(--surface-hover)]'
                                            }`}
                                        />
                                    ))}
                                </div>
                            </section>
                        )}
                        {reviewModalStep === 'details' && (
                            <section className="flex-1 min-h-0 overflow-y-auto px-4 pt-4 pb-4 space-y-4">
                                <div>
                                    <label
                                        htmlFor="review-meeting-date"
                                        className="text-sm font-medium text-muted block mb-1"
                                    >
                                        Meeting date (book club)
                                    </label>
                                    <input
                                        id="review-meeting-date"
                                        type="date"
                                        value={meetingDate}
                                        onChange={(e) => {
                                            setMeetingDate(e.target.value);
                                            setCloseVoteDate(
                                                getDefaultCloseVoteDate(
                                                    e.target.value,
                                                ),
                                            );
                                        }}
                                        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                                        aria-label="Meeting date"
                                    />
                                </div>
                                <div>
                                    <label
                                        htmlFor="review-close-vote-date"
                                        className="text-sm font-medium text-muted block mb-1"
                                    >
                                        Close vote date
                                    </label>
                                    <input
                                        id="review-close-vote-date"
                                        type="date"
                                        value={closeVoteDate}
                                        onChange={(e) =>
                                            setCloseVoteDate(e.target.value)
                                        }
                                        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                                        aria-label="Close vote date"
                                    />
                                </div>
                                <div>
                                    <label
                                        htmlFor="review-vote-access-password"
                                        className="text-sm font-medium text-muted block mb-1"
                                    >
                                        Vote access password (optional)
                                    </label>
                                    <input
                                        id="review-vote-access-password"
                                        type="password"
                                        value={voteAccessPassword}
                                        onChange={(e) =>
                                            setVoteAccessPassword(
                                                e.target.value,
                                            )
                                        }
                                        placeholder="Leave blank for no password"
                                        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                                        aria-label="Vote access password"
                                    />
                                </div>
                            </section>
                        )}
                        <div className="p-4 border-t border-border shrink-0 bg-surface">
                            {createMessage?.type === 'error' && (
                                <p
                                    role="alert"
                                    className="text-sm text-red-600 dark:text-red-400 mb-3"
                                >
                                    {createMessage.text}
                                </p>
                            )}
                            <div className="flex gap-3">
                                {reviewModalStep === 'books' ? (
                                    <>
                                        <button
                                            type="button"
                                            onClick={goBackFromReview}
                                            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-border px-4 py-3 text-sm font-medium hover:bg-[var(--surface-hover)]"
                                        >
                                            <BackArrowIcon className="size-4 shrink-0" />
                                            Back
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setReviewModalStep('details')
                                            }
                                            className="flex-1 rounded-lg bg-primary text-primary-foreground px-4 py-3 text-sm font-medium hover:bg-[var(--primary-hover)]"
                                        >
                                            Next
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setReviewModalStep('books')
                                            }
                                            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-border px-4 py-3 text-sm font-medium hover:bg-[var(--surface-hover)]"
                                        >
                                            <BackArrowIcon className="size-4 shrink-0" />
                                            Back
                                        </button>
                                        <button
                                            type="button"
                                            onClick={createFromReview}
                                            disabled={createMutation.isPending}
                                            className="flex-1 rounded-lg bg-primary text-primary-foreground px-4 py-3 text-sm font-medium hover:bg-[var(--primary-hover)] disabled:opacity-50"
                                        >
                                            {createMutation.isPending
                                                ? 'Creating…'
                                                : 'Confirm'}
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Builder footer */}
            {selected.length >= 1 && (
                <footer className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-surface shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] dark:shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.3)]">
                    <div className="max-w-2xl mx-auto px-4 py-4">
                        <h2 className="text-sm font-medium text-muted dark:text-muted mb-2">
                            Selected ({selected.length}/{MAX_SELECTED})
                        </h2>
                        <ul className="space-y-2">
                            {selected.map((book) => (
                                <li
                                    key={book.externalId}
                                    className="flex items-center justify-between gap-2 rounded-lg border border-border bg-[var(--surface-hover)] px-3 py-2"
                                >
                                    <span className="text-sm font-medium truncate min-w-0 flex-1">
                                        {book.title}
                                    </span>
                                    <span className="text-xs text-muted truncate max-w-[140px] flex-shrink-0">
                                        by {book.author}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            removeSelected(book.externalId)
                                        }
                                        className="text-xs text-red-600 dark:text-red-400 hover:underline flex-shrink-0"
                                        aria-label={`Remove ${book.title}`}
                                    >
                                        Remove
                                    </button>
                                </li>
                            ))}
                        </ul>
                        <div className="mt-6 flex gap-2 justify-end">
                            <button
                                type="button"
                                onClick={reset}
                                disabled={createMutation.isPending}
                                className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-[var(--surface-hover)]"
                            >
                                Reset
                            </button>
                            <button
                                type="button"
                                onClick={goToReview}
                                disabled={
                                    createMutation.isPending ||
                                    selected.length < MIN_TO_CREATE
                                }
                                className="rounded-lg bg-green-600 text-white px-4 py-2 text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                            >
                                {selected.length >= MIN_TO_CREATE
                                    ? 'Review'
                                    : 'Required: at least 2 selections'}
                            </button>
                        </div>
                    </div>
                </footer>
            )}
        </div>
    );
}
