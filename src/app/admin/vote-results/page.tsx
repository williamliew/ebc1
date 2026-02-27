'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { BackArrowIcon } from '@/components/back-arrow-icon';
import { LoadingMinDuration } from '@/components/loading-min-duration';

type VoteResultItem = {
    externalId: string;
    title: string;
    voteCount: number;
    isWinner: boolean;
};

type VoteResultsRound = {
    id: number;
    meetingDate: string;
    results: VoteResultItem[];
};

const PIE_COLOURS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

function formatMeetingDate(iso: string): string {
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
}

async function fetchVoteResults(): Promise<{ rounds: VoteResultsRound[] }> {
    const res = await fetch('/api/admin/vote-results', {
        credentials: 'include',
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Failed to load vote results');
    }
    return res.json();
}

export default function VoteResultsPage() {
    const { data, isLoading, error } = useQuery({
        queryKey: ['admin', 'vote-results'],
        queryFn: fetchVoteResults,
    });

    const [selectedIndex, setSelectedIndex] = useState(0);
    const rounds = data?.rounds ?? [];
    const selectedRound = rounds[selectedIndex] ?? null;

    const pieData = useMemo(
        () =>
            selectedRound?.results.map((r, i) => ({
                name: r.title,
                value: r.voteCount > 0 ? r.voteCount : 0.01,
                voteCount: r.voteCount,
                fullLabel: `${r.title} (${r.voteCount})`,
                isWinner: r.isWinner,
                fill: PIE_COLOURS[i % PIE_COLOURS.length],
            })) ?? [],
        [selectedRound],
    );

    const totalVotes =
        selectedRound?.results.reduce((sum, r) => sum + r.voteCount, 0) ?? 0;

    const highchartsOptions = useMemo<Highcharts.Options>(
        () => ({
            chart: {
                type: 'pie',
                backgroundColor: 'transparent',
                height: 440,
            },
            title: { text: undefined },
            credits: { enabled: false },
            tooltip: {
                pointFormat:
                    '<b>{point.voteCount}</b> vote(s) ({point.percentage:.1f}%)',
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
                    name: 'Votes',
                    data: pieData.map((entry) => ({
                        name: entry.name,
                        y: entry.value,
                        voteCount: entry.voteCount,
                        color: entry.fill,
                        sliced: entry.isWinner,
                        selected: entry.isWinner,
                    })),
                },
            ],
        }),
        [pieData],
    );

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
                            Vote results
                        </h1>
                        <p className="text-sm text-muted mt-1">
                            View vote counts and results for each round.
                        </p>
                    </header>

                    <main className="max-w-2xl mx-auto p-4 w-full">
                        {rounds.length === 0 ? (
                            <p className="text-muted py-8">
                                No vote rounds yet. Create one from the voting
                                builder.
                            </p>
                        ) : (
                            <>
                                <section className="mb-6">
                                    <p className="text-xs font-medium text-muted mb-2">
                                        Round (meeting date)
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
                                                {formatMeetingDate(
                                                    round.meetingDate,
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </section>

                                {selectedRound && (
                                    <section
                                        className="rounded-xl border border-border bg-surface p-4"
                                        aria-label={`Results for ${formatMeetingDate(selectedRound.meetingDate)}`}
                                    >
                                        <div className="h-[440px] min-h-[440px] w-full min-w-0">
                                            <HighchartsReact
                                                highcharts={Highcharts}
                                                options={highchartsOptions}
                                                containerProps={{
                                                    style: {
                                                        width: '100%',
                                                        height: '440px',
                                                    },
                                                }}
                                            />
                                        </div>
                                        <ul className="mt-4 space-y-2 list-none">
                                            {selectedRound.results.map(
                                                (item, i) => {
                                                    const pct =
                                                        totalVotes > 0
                                                            ? (item.voteCount /
                                                                  totalVotes) *
                                                              100
                                                            : 0;
                                                    return (
                                                        <li
                                                            key={
                                                                item.externalId
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
                                                            <span
                                                                className={
                                                                    item.isWinner
                                                                        ? 'font-semibold'
                                                                        : ''
                                                                }
                                                            >
                                                                {item.title}
                                                            </span>
                                                            <span className="text-muted ml-auto shrink-0">
                                                                {item.voteCount}{' '}
                                                                vote
                                                                {item.voteCount !==
                                                                1
                                                                    ? 's'
                                                                    : ''}{' '}
                                                                (
                                                                {pct.toFixed(1)}
                                                                %)
                                                            </span>
                                                        </li>
                                                    );
                                                },
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
