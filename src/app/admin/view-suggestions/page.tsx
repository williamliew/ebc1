'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { BackArrowIcon } from '@/components/back-arrow-icon';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { LoadingMinDuration } from '@/components/loading-min-duration';
import { sanitiseSuggestionComment } from '@/lib/sanitize-suggestion-comment';

type SuggestionResultItem = {
    bookExternalId: string;
    title: string | null;
    author: string | null;
    suggestionCount: number;
};

type SuggestionListItem = {
    id: number;
    createdAt: string;
    title: string | null;
    author: string | null;
    comment: string | null;
    commenterName: string | null;
};

type SuggestionResultsRound = {
    id: number;
    suggestionsForDate: string | null;
    closeAt: string | null;
    results: SuggestionResultItem[];
    items: SuggestionListItem[];
};

const PIE_COLOURS = [
    'var(--chart-1, #3b82f6)',
    'var(--chart-2, #10b981)',
    'var(--chart-3, #f59e0b)',
    'var(--chart-4, #ef4444)',
    'var(--chart-5, #8b5cf6)',
];

function formatRoundLabel(round: SuggestionResultsRound): string {
    if (round.suggestionsForDate) {
        const d = new Date(round.suggestionsForDate + 'T12:00:00');
        const month = new Intl.DateTimeFormat('en-GB', {
            month: 'long',
        }).format(d);
        return month;
    }
    if (round.closeAt) {
        const d = new Date(round.closeAt);
        return new Intl.DateTimeFormat('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        }).format(d);
    }
    return `Round ${round.id}`;
}

function formatRoundMonthTitle(round: SuggestionResultsRound): string {
    if (round.suggestionsForDate) {
        const d = new Date(round.suggestionsForDate + 'T12:00:00');
        return new Intl.DateTimeFormat('en-GB', {
            month: 'long',
            year: 'numeric',
        }).format(d);
    }
    if (round.closeAt) {
        const d = new Date(round.closeAt);
        return new Intl.DateTimeFormat('en-GB', {
            month: 'long',
            year: 'numeric',
        }).format(d);
    }
    return `Round ${round.id}`;
}

async function fetchSuggestionResults(): Promise<{
    rounds: SuggestionResultsRound[];
}> {
    const res = await fetch('/api/admin/suggestion-results', {
        credentials: 'include',
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Failed to load suggestion results');
    }
    return res.json();
}

export default function ViewSuggestionsPage() {
    const queryClient = useQueryClient();
    const { data, isLoading, error } = useQuery({
        queryKey: ['admin', 'suggestion-results'],
        queryFn: fetchSuggestionResults,
    });

    const [selectedIndex, setSelectedIndex] = useState(0);
    const [itemToRemove, setItemToRemove] =
        useState<SuggestionListItem | null>(null);
    const rounds = data?.rounds ?? [];
    const selectedRound = rounds[selectedIndex] ?? null;

    const deleteMutation = useMutation({
        mutationFn: async (suggestionId: number) => {
            const res = await fetch(
                `/api/admin/suggestions/${suggestionId}`,
                { method: 'DELETE', credentials: 'include' },
            );
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error ?? 'Failed to delete suggestion');
            }
        },
        onSuccess: () => {
            setItemToRemove(null);
            queryClient.invalidateQueries({
                queryKey: ['admin', 'suggestion-results'],
            });
        },
    });

    const pieData =
        selectedRound?.results.map((r, i) => ({
            name: r.title ?? 'Unknown',
            value: r.suggestionCount > 0 ? r.suggestionCount : 0.01,
            fill: PIE_COLOURS[i % PIE_COLOURS.length],
        })) ?? [];

    return (
        <LoadingMinDuration
            isLoading={isLoading}
            loaderWrapperClassName="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6"
        >
            {error ? (
                <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6">
                    <p className="text-red-600 dark:text-red-400">
                        {error instanceof Error
                            ? error.message
                            : 'Failed to load'}
                    </p>
                    <Link
                        href="/"
                        className="mt-4 inline-flex items-center gap-1.5 text-sm text-muted underline hover:no-underline"
                    >
                        <BackArrowIcon className="size-4 shrink-0" />
                        Back to home
                    </Link>
                </div>
            ) : (
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
                            View suggestions
                        </h1>
                        <p className="text-sm text-muted mt-1">
                            View suggestion counts per book for each round.
                        </p>
                    </header>

                    <main className="max-w-2xl mx-auto p-4 w-full">
                        {rounds.length === 0 ? (
                            <p className="text-muted py-8">
                                No suggestion rounds yet. Open book suggestions
                                from the admin panel to create one.
                            </p>
                        ) : (
                            <>
                                <section className="mb-6">
                                    <p className="text-xs font-medium text-muted mb-2">
                                        Round
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {rounds.map((round, i) => (
                                            <button
                                                key={round.id}
                                                type="button"
                                                onClick={() =>
                                                    setSelectedIndex(i)
                                                }
                                                className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                                                    selectedIndex === i
                                                        ? 'border-primary bg-primary text-primary-foreground'
                                                        : 'border-border bg-surface hover:bg-[var(--surface-hover)]'
                                                }`}
                                            >
                                                {formatRoundLabel(round)}
                                            </button>
                                        ))}
                                    </div>
                                </section>

                                {selectedRound && (
                                    <section
                                        className="rounded-xl border border-border bg-surface p-4"
                                        aria-label={`Suggestions for ${formatRoundLabel(selectedRound)}`}
                                    >
                                        <h2 className="text-lg font-semibold text-foreground mb-3">
                                            {formatRoundMonthTitle(
                                                selectedRound,
                                            )}
                                        </h2>
                                        <div className="h-[320px] w-full">
                                            <ResponsiveContainer
                                                width="100%"
                                                height="100%"
                                            >
                                                <PieChart>
                                                    <defs>
                                                        <filter
                                                            id="view-suggestions-pie-shadow"
                                                            x="-20%"
                                                            y="-20%"
                                                            width="140%"
                                                            height="140%"
                                                        >
                                                            <feDropShadow
                                                                dx={0}
                                                                dy={1}
                                                                stdDeviation={
                                                                    1.5
                                                                }
                                                                floodOpacity={
                                                                    0.12
                                                                }
                                                                floodColor="var(--foreground)"
                                                            />
                                                        </filter>
                                                    </defs>
                                                    <Pie
                                                        data={pieData}
                                                        dataKey="value"
                                                        nameKey="name"
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={0}
                                                        outerRadius="75%"
                                                        paddingAngle={0}
                                                        minAngle={0}
                                                        isAnimationActive
                                                        animationDuration={500}
                                                        animationEasing="ease-out"
                                                    >
                                                        {pieData.map(
                                                            (entry, index) => (
                                                                <Cell
                                                                    key={`cell-${index}`}
                                                                    fill={
                                                                        entry.fill
                                                                    }
                                                                    stroke="var(--background)"
                                                                    strokeWidth={
                                                                        1
                                                                    }
                                                                    style={{
                                                                        filter: 'url(#view-suggestions-pie-shadow)',
                                                                    }}
                                                                />
                                                            ),
                                                        )}
                                                    </Pie>
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <h2 className="text-sm font-medium text-foreground mt-4 mb-2">
                                            By book (count):
                                        </h2>
                                        <ul className="space-y-2 list-none">
                                            {selectedRound.results.map(
                                                (item, i) => (
                                                    <li
                                                        key={
                                                            item.bookExternalId
                                                        }
                                                        className="flex items-center gap-2 text-sm"
                                                    >
                                                        <span
                                                            className="shrink-0 w-3 h-3 rounded-full"
                                                            style={{
                                                                backgroundColor:
                                                                    PIE_COLOURS[
                                                                        i %
                                                                            PIE_COLOURS.length
                                                                    ],
                                                            }}
                                                            aria-hidden
                                                        />
                                                        <span>
                                                            {item.title ??
                                                                'Unknown title'}{' '}
                                                            by{' '}
                                                            {item.author ??
                                                                'Unknown author'}{' '}
                                                            (
                                                            {
                                                                item.suggestionCount
                                                            }
                                                            )
                                                        </span>
                                                    </li>
                                                ),
                                            )}
                                        </ul>

                                        <h2 className="text-sm font-medium text-foreground mt-6 mb-2">
                                            Each suggestion
                                        </h2>
                                        <ul className="space-y-4 list-none">
                                            {selectedRound.items.map((item) => (
                                                    <li
                                                        key={item.id}
                                                        className="rounded-lg border border-border bg-background p-4 text-sm"
                                                    >
                                                        <div className="flex items-center justify-between gap-2 mb-2">
                                                            <p className="text-xs text-muted">
                                                                Added{' '}
                                                                {new Date(
                                                                    item.createdAt,
                                                                ).toLocaleDateString(
                                                                    'en-GB',
                                                                    {
                                                                        day: 'numeric',
                                                                        month: 'short',
                                                                        year: 'numeric',
                                                                    },
                                                                )}
                                                            </p>
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    setItemToRemove(
                                                                        item,
                                                                    )
                                                                }
                                                                className="shrink-0 rounded border border-border px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                                                            >
                                                                Remove
                                                            </button>
                                                        </div>
                                                        <p className="font-medium text-foreground">
                                                            {item.title ??
                                                                'Unknown title'}{' '}
                                                            by{' '}
                                                            {item.author ??
                                                                'Unknown author'}
                                                        </p>
                                                        {(item.comment != null &&
                                                            item.comment.trim() !==
                                                                '') && (
                                                            <div className="mt-2">
                                                                <p className="text-xs font-medium text-muted mb-1">
                                                                    Comment
                                                                </p>
                                                                <div className="text-foreground prose prose-sm dark:prose-invert max-w-none">
                                                                    <span
                                                                        dangerouslySetInnerHTML={{
                                                                            __html: sanitiseSuggestionComment(
                                                                                item.comment,
                                                                            ),
                                                                        }}
                                                                    />
                                                                    <span className="text-muted">
                                                                        {' '}
                                                                        —{' '}
                                                                        {item.commenterName?.trim()
                                                                            ? item.commenterName
                                                                            : 'Anonymous'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        )}
                                                        {(!item.comment ||
                                                            item.comment.trim() ===
                                                                '') && (
                                                            <p className="mt-2 text-muted">
                                                                —{' '}
                                                                {item.commenterName?.trim()
                                                                    ? item.commenterName
                                                                    : 'Anonymous'}
                                                            </p>
                                                        )}
                                                    </li>
                                                ),
                                            )}
                                        </ul>
                                    </section>
                                )}
                            </>
                        )}
                    </main>

                    {itemToRemove && (
                        <div
                            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="delete-confirm-title"
                        >
                            <div className="rounded-xl border border-border bg-surface shadow-xl max-w-md w-full p-4">
                                <h2
                                    id="delete-confirm-title"
                                    className="text-lg font-semibold text-foreground mb-3"
                                >
                                    Are you sure you want to delete this from
                                    the records?
                                </h2>
                                <div className="rounded-lg border border-border bg-background p-4 text-sm mb-4">
                                    <p className="text-xs text-muted mb-1">
                                        Added{' '}
                                        {new Date(
                                            itemToRemove.createdAt,
                                        ).toLocaleDateString('en-GB', {
                                            day: 'numeric',
                                            month: 'short',
                                            year: 'numeric',
                                        })}
                                    </p>
                                    <p className="font-medium text-foreground">
                                        {itemToRemove.title ??
                                            'Unknown title'}{' '}
                                        by{' '}
                                        {itemToRemove.author ??
                                            'Unknown author'}
                                    </p>
                                    {itemToRemove.comment != null &&
                                        itemToRemove.comment.trim() !== '' && (
                                        <div className="mt-2">
                                            <p className="text-xs font-medium text-muted mb-1">
                                                Comment
                                            </p>
                                            <div className="text-foreground prose prose-sm dark:prose-invert max-w-none">
                                                <span
                                                    dangerouslySetInnerHTML={{
                                                        __html: sanitiseSuggestionComment(
                                                            itemToRemove.comment,
                                                        ),
                                                    }}
                                                />
                                                <span className="text-muted">
                                                    {' '}
                                                    —{' '}
                                                    {itemToRemove.commenterName?.trim()
                                                        ? itemToRemove.commenterName
                                                        : 'Anonymous'}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                    {(!itemToRemove.comment ||
                                        itemToRemove.comment.trim() === '') && (
                                        <p className="mt-2 text-muted">
                                            —{' '}
                                            {itemToRemove.commenterName?.trim()
                                                ? itemToRemove.commenterName
                                                : 'Anonymous'}
                                        </p>
                                    )}
                                </div>
                                <div className="flex gap-3 justify-end">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setItemToRemove(null)
                                        }
                                        className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-[var(--surface-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            deleteMutation.mutate(
                                                itemToRemove.id,
                                            )
                                        }
                                        disabled={deleteMutation.isPending}
                                        className="rounded-lg bg-red-600 text-white px-4 py-2 text-sm font-medium hover:bg-red-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                                    >
                                        {deleteMutation.isPending
                                            ? 'Deleting…'
                                            : 'Confirm'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </LoadingMinDuration>
    );
}
