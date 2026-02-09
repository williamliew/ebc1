'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { BackArrowIcon } from '@/components/back-arrow-icon';
import { PieChart, Pie, Cell, Sector, ResponsiveContainer } from 'recharts';
import type { PieSectorShapeProps } from 'recharts';
import { LoadingBookFlip } from '@/components/loading-book-flip';
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

const PIE_COLOURS = [
    'var(--chart-1, #3b82f6)',
    'var(--chart-2, #10b981)',
    'var(--chart-3, #f59e0b)',
    'var(--chart-4, #ef4444)',
];
const WINNER_RADIUS_BUMP = 12;

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

    const pieData =
        selectedRound?.results.map((r, i) => ({
            name: r.title,
            value: r.voteCount > 0 ? r.voteCount : 0.01,
            fullLabel: `${r.title} (${r.voteCount})`,
            isWinner: r.isWinner,
            fill: PIE_COLOURS[i % PIE_COLOURS.length],
        })) ?? [];

    const winnerIndex =
        selectedRound?.results.findIndex((r) => r.isWinner) ?? -1;

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
                        <h1 className="font-heading text-xl font-semibold">Vote results</h1>
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
                                        <div className="h-[320px] w-full">
                                            <ResponsiveContainer
                                                width="100%"
                                                height="100%"
                                            >
                                                <PieChart>
                                                    <defs>
                                                        <filter
                                                            id="vote-results-pie-shadow"
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
                                                        shape={(
                                                            props: PieSectorShapeProps,
                                                            index: number,
                                                        ) => {
                                                            const isWinner =
                                                                winnerIndex >=
                                                                    0 &&
                                                                index ===
                                                                    winnerIndex;
                                                            const baseRadius =
                                                                Number(
                                                                    props.outerRadius ??
                                                                        0,
                                                                ) || 0;
                                                            return (
                                                                <Sector
                                                                    {...props}
                                                                    outerRadius={
                                                                        isWinner
                                                                            ? baseRadius +
                                                                              WINNER_RADIUS_BUMP
                                                                            : baseRadius
                                                                    }
                                                                    fill={
                                                                        (props.fill as string) ??
                                                                        PIE_COLOURS[0]
                                                                    }
                                                                    stroke="var(--background)"
                                                                    strokeWidth={
                                                                        1
                                                                    }
                                                                    style={{
                                                                        filter: 'url(#vote-results-pie-shadow)',
                                                                    }}
                                                                />
                                                            );
                                                        }}
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
                                                                />
                                                            ),
                                                        )}
                                                    </Pie>
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <ul className="mt-4 space-y-2 list-none">
                                            {selectedRound.results.map(
                                                (item, i) => (
                                                    <li
                                                        key={item.externalId}
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
                                                        <span className="text-muted ml-auto">
                                                            {item.voteCount}{' '}
                                                            vote
                                                            {item.voteCount !==
                                                            1
                                                                ? 's'
                                                                : ''}
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
