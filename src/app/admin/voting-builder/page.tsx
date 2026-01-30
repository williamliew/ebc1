'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import Image from 'next/image';

type BookSearchResult = {
    externalId: string;
    title: string;
    author: string;
    coverUrl: string | null;
    blurb: string | null;
    link: string | null;
};

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
    const [query, setQuery] = useState('');
    const defaultMeeting = getDefaultMeetingDate();
    const [meetingDate, setMeetingDate] = useState(defaultMeeting);
    const [closeVoteDate, setCloseVoteDate] = useState(getTomorrowDate);
    const [searchResults, setSearchResults] = useState<BookSearchResult[]>([]);
    const [selected, setSelected] = useState<BookSearchResult[]>([]);
    const [searchError, setSearchError] = useState<string | null>(null);
    const [createMessage, setCreateMessage] = useState<{
        type: 'success' | 'error';
        text: string;
    } | null>(null);
    const queryClient = useQueryClient();

    const searchMutation = useMutation({
        mutationFn: async (q: string) => {
            const res = await fetch('/api/books/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: q }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error ?? 'Search failed');
            }
            return res.json() as Promise<{ results: BookSearchResult[] }>;
        },
        onSuccess: (data) => {
            setSearchResults(data.results);
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
            books,
        }: {
            meetingDate: string;
            closeVoteDate: string;
            books: BookSearchResult[];
        }) => {
            const res = await fetch('/api/nomination', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    meetingDate: date,
                    closeVoteDate: closeDate,
                    books: books.map((b) => ({ externalId: b.externalId })),
                }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error ?? 'Failed to create round');
            }
            return res.json();
        },
        onSuccess: (_, variables) => {
            setCreateMessage({
                type: 'success',
                text: `Nomination round created for ${variables.meetingDate}.`,
            });
            setSelected([]);
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

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = query.trim();
        if (!trimmed) return;
        searchMutation.mutate(trimmed);
    };

    const addSelected = (book: BookSearchResult) => {
        if (selected.length >= MAX_SELECTED) return;
        if (selected.some((b) => b.externalId === book.externalId)) return;
        setSelected((prev) => [...prev, book]);
    };

    const removeSelected = (externalId: string) => {
        setSelected((prev) => prev.filter((b) => b.externalId !== externalId));
    };

    const reset = () => {
        setSelected([]);
        setCreateMessage(null);
    };

    const create = () => {
        if (selected.length < MIN_TO_CREATE) return;
        createMutation.mutate({
            meetingDate,
            closeVoteDate,
            books: selected,
        });
    };

    const canCreate =
        selected.length >= MIN_TO_CREATE && selected.length <= MAX_SELECTED;

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
            <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-4">
                <h1 className="text-xl font-semibold">Voting page builder</h1>
                <p className="text-sm text-zinc-500 mt-1">
                    Search books, select up to {MAX_SELECTED}, then create the
                    nomination round (min {MIN_TO_CREATE} books).
                </p>
            </header>

            <main
                className={`max-w-2xl mx-auto p-4 space-y-6 ${selected.length >= 1 ? 'pb-80' : ''}`}
            >
                {/* Search */}
                <section>
                    <form onSubmit={handleSearch} className="flex gap-2">
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search by title or author..."
                            className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600"
                            aria-label="Book search"
                        />
                        <button
                            type="submit"
                            disabled={searchMutation.isPending}
                            className="rounded-lg bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900 px-4 py-2 text-sm font-medium hover:bg-zinc-700 dark:hover:bg-zinc-300 disabled:opacity-50"
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

                {/* Search results */}
                {searchResults.length > 0 && (
                    <section>
                        <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">
                            Results
                        </h2>
                        <ul className="space-y-3">
                            {searchResults.map((book) => {
                                const alreadySelected = selected.some(
                                    (b) => b.externalId === book.externalId,
                                );
                                const atMax = selected.length >= MAX_SELECTED;
                                return (
                                    <li
                                        key={book.externalId}
                                        className="flex gap-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3"
                                    >
                                        <div className="flex-shrink-0 w-12 h-18 relative bg-zinc-200 dark:bg-zinc-700 rounded overflow-hidden">
                                            {book.coverUrl ? (
                                                <Image
                                                    src={book.coverUrl}
                                                    alt=""
                                                    fill
                                                    className="object-cover"
                                                    unoptimized
                                                    sizes="48px"
                                                />
                                            ) : (
                                                <span className="text-xs text-zinc-400 flex items-center justify-center h-full">
                                                    No cover
                                                </span>
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="font-medium text-sm truncate">
                                                {book.title}
                                            </p>
                                            <p className="text-xs text-zinc-500 truncate">
                                                {book.author}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                alreadySelected
                                                    ? removeSelected(
                                                          book.externalId,
                                                      )
                                                    : addSelected(book)
                                            }
                                            disabled={!alreadySelected && atMax}
                                            className="flex-shrink-0 rounded-md bg-zinc-700 dark:bg-zinc-300 text-white dark:text-zinc-900 px-3 py-1.5 text-xs font-medium hover:bg-zinc-600 dark:hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed"
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

                {createMessage && (
                    <p
                        role="alert"
                        className={
                            createMessage.type === 'success'
                                ? 'text-sm text-green-600 dark:text-green-400'
                                : 'text-sm text-red-600 dark:text-red-400'
                        }
                    >
                        {createMessage.text}
                    </p>
                )}
            </main>

            {/* Fixed bottom: only when at least 1 book selected */}
            {selected.length >= 1 && (
                <footer className="fixed inset-x-0 bottom-0 z-10 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] dark:shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.3)]">
                    <div className="max-w-2xl mx-auto px-4 py-4">
                        <div className="mb-3 flex gap-4 flex-wrap">
                            <div className="flex-1 min-w-[140px]">
                                <label
                                    htmlFor="meeting-date"
                                    className="text-sm font-medium text-zinc-500 dark:text-zinc-400 block mb-1"
                                >
                                    Meeting date (book club)
                                </label>
                                <input
                                    id="meeting-date"
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
                                    className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600"
                                    aria-label="Meeting date"
                                />
                            </div>
                            <div className="flex-1 min-w-[140px]">
                                <label
                                    htmlFor="close-vote-date"
                                    className="text-sm font-medium text-zinc-500 dark:text-zinc-400 block mb-1"
                                >
                                    Close vote
                                </label>
                                <input
                                    id="close-vote-date"
                                    type="date"
                                    value={closeVoteDate}
                                    onChange={(e) =>
                                        setCloseVoteDate(e.target.value)
                                    }
                                    className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600"
                                    aria-label="Close vote date"
                                />
                            </div>
                        </div>
                        <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">
                            Selected ({selected.length}/{MAX_SELECTED})
                        </h2>
                        <ul className="space-y-2">
                            {selected.map((book) => (
                                <li
                                    key={book.externalId}
                                    className="flex items-center justify-between gap-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3 py-2"
                                >
                                    <span className="text-sm font-medium truncate min-w-0 flex-1">
                                        {book.title}
                                    </span>
                                    <span className="text-xs text-zinc-500 truncate max-w-[140px] flex-shrink-0">
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
                        {selected.length >= 1 && (
                            <div className="mt-6 flex gap-2 justify-end">
                                <button
                                    type="button"
                                    onClick={reset}
                                    disabled={createMutation.isPending}
                                    className="rounded-lg border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                >
                                    Reset
                                </button>
                                <button
                                    type="button"
                                    onClick={create}
                                    disabled={
                                        createMutation.isPending ||
                                        selected.length < MIN_TO_CREATE
                                    }
                                    className="rounded-lg bg-green-600 text-white px-4 py-2 text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                                >
                                    {createMutation.isPending
                                        ? 'Creating…'
                                        : selected.length >= MIN_TO_CREATE
                                          ? 'Create vote'
                                          : 'Required: at least 2 selections'}
                                </button>
                            </div>
                        )}
                    </div>
                </footer>
            )}
        </div>
    );
}
