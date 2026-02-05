'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { LoadingBookFlip } from '@/components/loading-book-flip';
import { LoadingMinDuration } from '@/components/loading-min-duration';

type SuggestionResultItem = {
    bookExternalId: string;
    title: string | null;
    author: string | null;
    suggestionCount: number;
};

type SuggestionResultsRound = {
    id: number;
    suggestionsForDate: string | null;
    closeAt: string | null;
    results: SuggestionResultItem[];
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
    const { data, isLoading, error } = useQuery({
        queryKey: ['admin', 'suggestion-results'],
        queryFn: fetchSuggestionResults,
    });

    const [selectedIndex, setSelectedIndex] = useState(0);
    const rounds = data?.rounds ?? [];
    const selectedRound = rounds[selectedIndex] ?? null;

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
                        className="mt-4 text-sm text-muted underline hover:no-underline"
                    >
                        ← Back to home
                    </Link>
                </div>
            ) : (
                <div className="min-h-screen bg-background text-foreground">
                    <header className="border-b border-border bg-surface px-4 py-4">
                        <Link
                            href="/"
                            className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground mb-2"
                        >
                            ← Back to home
                        </Link>
                        <h1 className="text-xl font-semibold">
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
                                            Suggestions:
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
                                    </section>
                                )}
                            </>
                        )}
                    </main>
                </div>
            )}
        </LoadingMinDuration>
    );
}
