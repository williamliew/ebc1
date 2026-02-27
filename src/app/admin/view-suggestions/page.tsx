'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { BackArrowIcon } from '@/components/back-arrow-icon';
import { BookCoverImage } from '@/components/book-cover-image';
import { CloseIcon } from '@/components/close-icon';
import { LoadingMinDuration } from '@/components/loading-min-duration';
import { sanitiseSuggestionComment } from '@/lib/sanitize-suggestion-comment';
import { sanitiseBlurb } from '@/lib/sanitize-blurb';

type SuggestionResultItem = {
    bookExternalId: string;
    title: string | null;
    author: string | null;
    suggestionCount: number;
};

type SuggestionListItem = {
    id: number;
    bookExternalId: string;
    createdAt: string;
    title: string | null;
    author: string | null;
    coverUrl: string | null;
    coverUrlOverrideApproved: boolean;
    comment: string | null;
    commenterName: string | null;
    blurb: string | null;
    manualPendingApproval: boolean;
};

type SuggestionResultsRound = {
    id: number;
    suggestionsForDate: string | null;
    closeAt: string | null;
    results: SuggestionResultItem[];
    items: SuggestionListItem[];
};

const PIE_COLOURS = [
    '#3b82f6',
    '#10b981',
    '#f59e0b',
    '#ef4444',
    '#8b5cf6',
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
    const [itemToApprove, setItemToApprove] = useState<{
        item: SuggestionListItem;
        roundLabel: string;
    } | null>(null);
    const [itemToApproveManual, setItemToApproveManual] = useState<{
        item: SuggestionListItem;
        roundLabel: string;
    } | null>(null);
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

    const approveMutation = useMutation({
        mutationFn: async (suggestionId: number) => {
            const res = await fetch(
                `/api/admin/suggestions/${suggestionId}`,
                {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        coverUrlOverrideApproved: true,
                    }),
                },
            );
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(
                    data.error ?? 'Failed to approve thumbnail',
                );
            }
        },
        onSuccess: () => {
            setItemToApprove(null);
            queryClient.invalidateQueries({
                queryKey: ['admin', 'suggestion-results'],
            });
        },
    });

    const approveManualMutation = useMutation({
        mutationFn: async (suggestionId: number) => {
            const res = await fetch(
                `/api/admin/suggestions/${suggestionId}`,
                {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        manualPendingApproval: false,
                    }),
                },
            );
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(
                    data.error ?? 'Failed to approve manual entry',
                );
            }
        },
        onSuccess: () => {
            setItemToApproveManual(null);
            queryClient.invalidateQueries({
                queryKey: ['admin', 'suggestion-results'],
            });
        },
    });

    const unapproveThumbnailMutation = useMutation({
        mutationFn: async (suggestionId: number) => {
            const res = await fetch(
                `/api/admin/suggestions/${suggestionId}`,
                {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        coverUrlOverrideApproved: false,
                    }),
                },
            );
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(
                    data.error ?? 'Failed to unapprove thumbnail',
                );
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['admin', 'suggestion-results'],
            });
        },
    });

    const unapproveManualMutation = useMutation({
        mutationFn: async (suggestionId: number) => {
            const res = await fetch(
                `/api/admin/suggestions/${suggestionId}`,
                {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        manualPendingApproval: true,
                    }),
                },
            );
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(
                    data.error ?? 'Failed to unapprove manual entry',
                );
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['admin', 'suggestion-results'],
            });
        },
    });

    const totalSuggestions =
        selectedRound?.results.reduce(
            (sum, r) => sum + r.suggestionCount,
            0,
        ) ?? 0;

    const highchartsOptions = useMemo<Highcharts.Options>(() => {
        const roundsList = data?.rounds ?? [];
        const round = roundsList[selectedIndex] ?? null;
        const seriesData =
            round?.results.map((r, i) => ({
                name: r.title ?? 'Unknown',
                y: r.suggestionCount > 0 ? r.suggestionCount : 0.01,
                suggestionCount: r.suggestionCount,
                color: PIE_COLOURS[i % PIE_COLOURS.length],
            })) ?? [];
        return {
            chart: {
                type: 'pie',
                backgroundColor: 'transparent',
                height: 440,
            },
            title: { text: undefined },
            credits: { enabled: false },
            tooltip: {
                pointFormat:
                    '<b>{point.suggestionCount}</b> suggestion(s) ({point.percentage:.1f}%)',
            },
            plotOptions: {
                pie: {
                    borderColor: 'var(--background)',
                    borderWidth: 1,
                    showInLegend: false,
                    allowPointSelect: true,
                    cursor: 'pointer',
                    dataLabels: [
                        {
                            enabled: true,
                            distance: 20,
                        },
                        {
                            enabled: true,
                            distance: -40,
                            format: '{point.percentage:.1f}%',
                            style: {
                                fontSize: '0.9em',
                                textOutline: 'none',
                                opacity: 0.7,
                            },
                            filter: {
                                operator: '>',
                                property: 'percentage',
                                value: 10,
                            },
                        },
                    ],
                },
            },
            series: [
                {
                    type: 'pie',
                    name: 'Suggestions',
                    enableMouseTracking: false,
                    animation: { duration: 2000 },
                    data: seriesData,
                },
            ],
        };
    }, [selectedIndex, data]);

    const awaitingApprovalByRound = (() => {
        return rounds
            .map((round) => ({
                roundId: round.id,
                roundLabel: formatRoundLabel(round),
                items: round.items.filter(
                    (item) =>
                        !item.manualPendingApproval &&
                        item.coverUrl != null &&
                        item.coverUrl.trim() !== '' &&
                        item.coverUrlOverrideApproved === false,
                ),
            }))
            .filter((g) => g.items.length > 0);
    })();

    const manualEntriesByRound = (() => {
        return rounds
            .map((round) => ({
                roundId: round.id,
                roundLabel: formatRoundLabel(round),
                items: round.items.filter(
                    (item) => item.manualPendingApproval,
                ),
            }))
            .filter((g) => g.items.length > 0);
    })();

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

                                {manualEntriesByRound.length > 0 && (
                                    <section
                                        className="rounded-xl border border-border bg-surface p-4 mb-6"
                                        aria-label="Manual entries awaiting approval"
                                    >
                                        <h2 className="text-lg font-semibold text-foreground mb-3">
                                            Manual entries awaiting approval
                                        </h2>
                                        <p className="text-sm text-muted mb-4">
                                            Manual submissions that will appear
                                            on the suggestnextbook page once
                                            approved.
                                        </p>
                                        {manualEntriesByRound.map(
                                            ({
                                                roundId,
                                                roundLabel,
                                                items,
                                            }) => (
                                                <div
                                                    key={roundId}
                                                    className="mb-6 last:mb-0"
                                                >
                                                    <h3 className="text-sm font-medium text-muted mb-2">
                                                        {roundLabel}
                                                    </h3>
                                                    <ul className="space-y-4 list-none">
                                                        {items.map((item) => (
                                                            <li
                                                                key={item.id}
                                                                className="flex gap-4 rounded-lg border border-border bg-background p-4 items-start"
                                                            >
                                                                <div className="w-16 h-24 shrink-0 rounded overflow-hidden bg-muted/50">
                                                                    {item.coverUrl ? (
                                                                        <BookCoverImage
                                                                            src={
                                                                                item.coverUrl
                                                                            }
                                                                            containerClassName="w-full h-full"
                                                                            sizes="64px"
                                                                        />
                                                                    ) : (
                                                                        <span className="text-[10px] text-muted flex items-center justify-center h-full p-1 text-center">
                                                                            No
                                                                            cover
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="font-medium text-foreground">
                                                                        {item.title ??
                                                                            'Unknown title'}{' '}
                                                                        by{' '}
                                                                        {item.author ??
                                                                            'Unknown author'}
                                                                    </p>
                                                                    <p className="text-xs text-muted mt-0.5">
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
                                                                    {item.blurb !=
                                                                        null &&
                                                                        item.blurb.trim() !==
                                                                            '' && (
                                                                            <div
                                                                                className="mt-2 text-sm prose prose-sm blurb-prose dark:prose-invert max-w-none"
                                                                                dangerouslySetInnerHTML={{
                                                                                    __html: sanitiseBlurb(
                                                                                        item.blurb,
                                                                                    ),
                                                                                }}
                                                                            />
                                                                        )}
                                                                    {(item.comment !=
                                                                        null &&
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
                                                                </div>
                                                                <div className="shrink-0 flex gap-2">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            setItemToApproveManual(
                                                                                {
                                                                                    item,
                                                                                    roundLabel,
                                                                                },
                                                                            )
                                                                        }
                                                                        className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2"
                                                                    >
                                                                        Approve
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            setItemToRemove(
                                                                                item,
                                                                            )
                                                                        }
                                                                        className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                                                                    >
                                                                        Remove
                                                                    </button>
                                                                </div>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            ),
                                        )}
                                    </section>
                                )}

                                {awaitingApprovalByRound.length > 0 && (
                                    <section
                                        className="rounded-xl border border-border bg-surface p-4 mb-6"
                                        aria-label="Thumbnails awaiting approval"
                                    >
                                        <h2 className="text-lg font-semibold text-foreground mb-3">
                                            Awaiting approval
                                        </h2>
                                        <p className="text-sm text-muted mb-4">
                                            Custom thumbnails that need
                                            approving before they appear on the
                                            public suggestnextbook page.
                                        </p>
                                        {awaitingApprovalByRound.map(
                                            ({
                                                roundId,
                                                roundLabel,
                                                items,
                                            }) => (
                                                <div
                                                    key={roundId}
                                                    className="mb-6 last:mb-0"
                                                >
                                                    <h3 className="text-sm font-medium text-muted mb-2">
                                                        {roundLabel}
                                                    </h3>
                                                    <ul className="space-y-4 list-none">
                                                        {items.map((item) => (
                                                            <li
                                                                key={item.id}
                                                                className="flex gap-4 rounded-lg border border-border bg-background text-foreground p-4 items-center"
                                                            >
                                                                <div className="w-16 h-24 shrink-0 rounded overflow-hidden bg-muted/50">
                                                                    <BookCoverImage
                                                                        src={
                                                                            item.coverUrl
                                                                        }
                                                                        containerClassName="w-full h-full"
                                                                        sizes="64px"
                                                                    />
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="font-medium text-foreground">
                                                                        {item.title ??
                                                                            'Unknown title'}{' '}
                                                                        by{' '}
                                                                        {item.author ??
                                                                            'Unknown author'}
                                                                    </p>
                                                                    <p className="text-xs text-muted mt-0.5">
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
                                                                </div>
                                                                <div className="shrink-0 flex gap-2">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            setItemToApprove(
                                                                                {
                                                                                    item,
                                                                                    roundLabel,
                                                                                },
                                                                            )
                                                                        }
                                                                        className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2"
                                                                    >
                                                                        Approve
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            setItemToRemove(
                                                                                item,
                                                                            )
                                                                        }
                                                                        className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                                                                    >
                                                                        Remove
                                                                    </button>
                                                                </div>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            ),
                                        )}
                                    </section>
                                )}

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
                                        <div className="h-[440px] min-h-[440px] w-full min-w-0">
                                            <HighchartsReact
                                                highcharts={Highcharts}
                                                options={highchartsOptions}
                                                containerProps={{
                                                    style: { width: '100%', height: '440px' },
                                                }}
                                            />
                                        </div>
                                        <h2 className="text-sm font-medium text-foreground mt-4 mb-2">
                                            By book (count and %):
                                        </h2>
                                        <ul className="space-y-2 list-none">
                                            {selectedRound.results.map(
                                                (item, i) => {
                                                    const pct =
                                                        totalSuggestions > 0
                                                            ? (item.suggestionCount /
                                                                  totalSuggestions) *
                                                              100
                                                            : 0;
                                                    return (
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
                                                                    'Unknown author'}
                                                            </span>
                                                            <span className="text-muted ml-auto shrink-0">
                                                                {item.suggestionCount}{' '}
                                                                (
                                                                {pct.toFixed(1)}
                                                                %)
                                                            </span>
                                                        </li>
                                                    );
                                                },
                                            )}
                                        </ul>

                                        <h2 className="text-sm font-medium text-foreground mt-6 mb-2">
                                            Each suggestion
                                        </h2>
                                        <ul className="space-y-4 list-none">
                                            {selectedRound.items
                                                .filter(
                                                    (item) =>
                                                        !item.manualPendingApproval,
                                                )
                                                .map((item) => (
                                                    <li
                                                        key={item.id}
                                                        className="rounded-lg border border-border bg-background p-4 text-sm"
                                                    >
                                                        <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
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
                                                            <div className="flex gap-2 shrink-0">
                                                                {item.coverUrlOverrideApproved &&
                                                                    item.coverUrl != null &&
                                                                    item.coverUrl.trim() !== '' && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() =>
                                                                                unapproveThumbnailMutation.mutate(
                                                                                    item.id,
                                                                                )
                                                                            }
                                                                            disabled={
                                                                                unapproveThumbnailMutation.isPending
                                                                            }
                                                                            className="rounded border border-border px-3 py-1.5 text-xs font-medium text-muted hover:bg-[var(--surface-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 disabled:opacity-50"
                                                                        >
                                                                            Unapprove
                                                                            thumbnail
                                                                        </button>
                                                                    )}
                                                                {item.bookExternalId.startsWith(
                                                                    'manual-',
                                                                ) && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            unapproveManualMutation.mutate(
                                                                                item.id,
                                                                            )
                                                                        }
                                                                        disabled={
                                                                            unapproveManualMutation.isPending
                                                                        }
                                                                        className="rounded border border-border px-3 py-1.5 text-xs font-medium text-muted hover:bg-[var(--surface-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 disabled:opacity-50"
                                                                    >
                                                                        Unapprove
                                                                    </button>
                                                                )}
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        setItemToRemove(
                                                                            item,
                                                                        )
                                                                    }
                                                                    className="rounded border border-border px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                                                                >
                                                                    Remove
                                                                </button>
                                                            </div>
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

                    {itemToApprove && (
                        <div
                            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="approve-confirm-title"
                        >
                            <div className="relative rounded-xl border border-border bg-surface shadow-xl max-w-md w-full p-4">
                                <button
                                    type="button"
                                    onClick={() =>
                                        setItemToApprove(null)
                                    }
                                    className="absolute right-3 top-3 rounded p-1 -m-1 hover:bg-[var(--surface-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                                    aria-label="Close"
                                >
                                    <CloseIcon className="h-5 w-5" />
                                </button>
                                <h2
                                    id="approve-confirm-title"
                                    className="text-lg font-semibold text-foreground mb-3 pr-8"
                                >
                                    Approve this thumbnail?
                                </h2>
                                <div className="flex gap-4 rounded-lg border border-border bg-surface text-foreground p-4 text-sm mb-4">
                                    <div className="w-14 h-[72px] shrink-0 rounded overflow-hidden bg-muted/50">
                                        <BookCoverImage
                                            src={itemToApprove.item.coverUrl}
                                            containerClassName="w-full h-full"
                                            sizes="56px"
                                        />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-medium text-foreground">
                                            {itemToApprove.item.title ??
                                                'Unknown title'}{' '}
                                            by{' '}
                                            {itemToApprove.item.author ??
                                                'Unknown author'}
                                        </p>
                                        <p className="text-xs text-muted mt-0.5">
                                            Added{' '}
                                            {new Date(
                                                itemToApprove.item.createdAt,
                                            ).toLocaleDateString('en-GB', {
                                                day: 'numeric',
                                                month: 'short',
                                                year: 'numeric',
                                            })}
                                        </p>
                                    </div>
                                </div>
                                <p className="text-sm text-muted mb-4">
                                    The thumbnail will then be visible on the
                                    public suggestnextbook page for this
                                    suggestion.
                                </p>
                                <div className="flex gap-3 justify-end">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setItemToApprove(null)
                                        }
                                        className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-[var(--surface-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                                    >
                                        Back
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            approveMutation.mutate(
                                                itemToApprove.item.id,
                                            )
                                        }
                                        disabled={approveMutation.isPending}
                                        className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2"
                                    >
                                        {approveMutation.isPending
                                            ? 'Approving…'
                                            : 'Confirm'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {itemToApproveManual && (
                        <div
                            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="approve-manual-title"
                        >
                            <div className="relative rounded-xl border border-border bg-surface shadow-xl max-w-md w-full p-4 max-h-[90vh] overflow-y-auto">
                                <button
                                    type="button"
                                    onClick={() =>
                                        setItemToApproveManual(null)
                                    }
                                    className="absolute right-3 top-3 rounded p-1 -m-1 hover:bg-[var(--surface-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                                    aria-label="Close"
                                >
                                    <CloseIcon className="h-5 w-5" />
                                </button>
                                <h2
                                    id="approve-manual-title"
                                    className="text-lg font-semibold text-foreground mb-3 pr-8"
                                >
                                    Approve this manual entry?
                                </h2>
                                <div className="flex gap-4 rounded-lg border border-border bg-background p-4 text-sm mb-4">
                                    <div className="w-14 h-[72px] shrink-0 rounded overflow-hidden bg-muted/50">
                                        {itemToApproveManual.item.coverUrl ? (
                                            <BookCoverImage
                                                src={
                                                    itemToApproveManual.item
                                                        .coverUrl
                                                }
                                                containerClassName="w-full h-full"
                                                sizes="56px"
                                            />
                                        ) : (
                                            <span className="text-[10px] text-muted flex items-center justify-center h-full p-1">
                                                No cover
                                            </span>
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-medium text-foreground">
                                            {itemToApproveManual.item.title ??
                                                'Unknown title'}{' '}
                                            by{' '}
                                            {itemToApproveManual.item.author ??
                                                'Unknown author'}
                                        </p>
                                        <p className="text-xs text-muted mt-0.5">
                                            {itemToApproveManual.roundLabel} · Added{' '}
                                            {new Date(
                                                itemToApproveManual.item
                                                    .createdAt,
                                            ).toLocaleDateString('en-GB', {
                                                day: 'numeric',
                                                month: 'short',
                                                year: 'numeric',
                                            })}
                                        </p>
                                    </div>
                                </div>
                                <p className="text-sm text-muted mb-4">
                                    It will then appear on the public
                                    suggestnextbook page.
                                </p>
                                <div className="flex gap-3 justify-end">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setItemToApproveManual(null)
                                        }
                                        className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-[var(--surface-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                                    >
                                        Back
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            approveManualMutation.mutate(
                                                itemToApproveManual.item.id,
                                            )
                                        }
                                        disabled={
                                            approveManualMutation.isPending
                                        }
                                        className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2"
                                    >
                                        {approveManualMutation.isPending
                                            ? 'Approving…'
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
