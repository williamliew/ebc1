import { NextResponse } from 'next/server';
import { desc, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import {
    voteRounds,
    voteRoundBooks,
    votes,
} from '@/db/schema';
import { requireAdmin } from '@/lib/admin-auth';

export type VoteResultItem = {
    externalId: string;
    title: string;
    voteCount: number;
    isWinner: boolean;
};

export type VoteResultsRound = {
    id: number;
    meetingDate: string;
    results: VoteResultItem[];
};

/**
 * GET: Admin only. Returns all vote rounds with vote tallies per book,
 * ordered by meeting date descending (most recent first).
 */
export async function GET(request: Request) {
    const authError = await requireAdmin(request);
    if (authError) return authError;

    if (!db) {
        return NextResponse.json(
            { error: 'Database not configured' },
            { status: 503 },
        );
    }

    try {
        const rounds = await db
            .select({
                id: voteRounds.id,
                meetingDate: voteRounds.meetingDate,
                winnerExternalId: voteRounds.winnerExternalId,
            })
            .from(voteRounds)
            .orderBy(desc(voteRounds.meetingDate));

        const result: VoteResultsRound[] = [];

        for (const round of rounds) {
            const books = await db
                .select({
                    externalId: voteRoundBooks.externalId,
                    title: voteRoundBooks.title,
                })
                .from(voteRoundBooks)
                .where(eq(voteRoundBooks.voteRoundId, round.id));

            const tallyRows = await db
                .select({
                    chosenBookExternalId: votes.chosenBookExternalId,
                    voteCount: sql<number>`count(*)::int`,
                })
                .from(votes)
                .where(eq(votes.voteRoundId, round.id))
                .groupBy(votes.chosenBookExternalId);

            const countByBook = new Map(
                tallyRows.map((r) => [r.chosenBookExternalId, r.voteCount]),
            );
            const winnerId = round.winnerExternalId ?? null;

            const results: VoteResultItem[] = books.map((b) => ({
                externalId: b.externalId,
                title: b.title,
                voteCount: countByBook.get(b.externalId) ?? 0,
                isWinner: winnerId === b.externalId,
            }));

            result.push({
                id: round.id,
                meetingDate: round.meetingDate,
                results,
            });
        }

        return NextResponse.json({ rounds: result });
    } catch (err) {
        console.error('Vote results fetch error:', err);
        return NextResponse.json(
            { error: 'Failed to fetch vote results' },
            { status: 500 },
        );
    }
}
