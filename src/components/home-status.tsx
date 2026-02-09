'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { SuggestIcon } from '@/components/suggest-icon';
import { VoteIcon } from '@/components/vote-icon';

type StatusData = {
    voteOpen: boolean;
    voteRoundId: number | null;
    voteCloseAt: string | null;
    suggestionsOpen: boolean;
    suggestionRoundId: number | null;
    suggestionsCloseAt: string | null;
    currentBook: {
        title: string;
        author: string;
        meetingDate: string;
    } | null;
};

async function fetchStatus(): Promise<StatusData> {
    const res = await fetch('/api/status', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch status');
    return res.json();
}

const linkClass =
    'inline-flex flex-col items-center justify-center rounded-lg bg-primary text-primary-foreground px-5 py-2.5 text-sm font-medium hover:bg-[var(--primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 focus:ring-offset-[var(--background)]';

export function HomeStatus() {
    const { data, isLoading, error } = useQuery({
        queryKey: ['home-status'],
        queryFn: fetchStatus,
        staleTime: 60 * 1000, // 1 min stale (browser still respects API Cache-Control)
    });

    if (error) {
        return (
            <div className="flex flex-col sm:flex-row flex-wrap gap-3 justify-center mt-10">
                <Link href="/vote" className={linkClass}>
                    Vote
                </Link>
                <Link href="/suggestnextbook" className={linkClass}>
                    Suggest next book
                </Link>
                <Link href="/nextbook" className={linkClass}>
                    Our current book
                </Link>
            </div>
        );
    }

    if (isLoading || !data) {
        return (
            <div className="flex flex-col sm:flex-row flex-wrap gap-3 justify-center mt-10">
                <span className={linkClass + ' opacity-70'}>Vote</span>
                <span className={linkClass + ' opacity-70'}>
                    Suggest next book
                </span>
                <span className={linkClass + ' opacity-70'}>
                    Our current book
                </span>
            </div>
        );
    }

    return (
        <div className="flex flex-col sm:flex-row flex-wrap gap-3 justify-center mt-10">
            <Link href="/vote" className={linkClass}>
                <span>Vote</span>
                <span className="text-xs opacity-90 mt-0.5 inline-flex items-center justify-center gap-1">
                    {data.voteOpen ? (
                        <>
                            Open — cast your vote
                            <VoteIcon className="size-3.5 shrink-0" />
                        </>
                    ) : (
                        'No vote at the moment'
                    )}
                </span>
            </Link>
            <Link href="/suggestnextbook" className={linkClass}>
                <span>Suggest next book</span>
                <span className="text-xs opacity-90 mt-0.5 inline-flex items-center justify-center gap-1">
                    {data.suggestionsOpen ? (
                        <>
                            Open — suggest a book
                            <SuggestIcon className="size-3.5 shrink-0" />
                        </>
                    ) : (
                        'Suggestions closed'
                    )}
                </span>
            </Link>
            <Link href="/nextbook" className={linkClass}>
                <span>Our current book</span>
            </Link>
        </div>
    );
}
