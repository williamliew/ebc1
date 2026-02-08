import { NextResponse } from 'next/server';
import { count, desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { voteRounds, voteRoundBooks, votes } from '@/db/schema';
import { requireAdmin } from '@/lib/admin-auth';

export type LatestVoteBook = {
    externalId: string;
    title: string;
    author: string;
    coverUrl: string | null;
    coverOptions: string[];
    blurb: string | null;
    link: string | null;
    voteCount: number;
};

/**
 * GET: Admin only. Returns the latest vote round (by meeting date) and its books.
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
        const [round] = await db
            .select({
                id: voteRounds.id,
                meetingDate: voteRounds.meetingDate,
            })
            .from(voteRounds)
            .orderBy(desc(voteRounds.meetingDate))
            .limit(1);

        if (!round) {
            return NextResponse.json({
                round: null,
                books: [],
            });
        }

        const books = await db
            .select({
                externalId: voteRoundBooks.externalId,
                title: voteRoundBooks.title,
                author: voteRoundBooks.author,
                coverUrl: voteRoundBooks.coverUrl,
                blurb: voteRoundBooks.blurb,
                link: voteRoundBooks.link,
            })
            .from(voteRoundBooks)
            .where(eq(voteRoundBooks.voteRoundId, round.id));

        const voteCounts = await db
            .select({
                chosenBookExternalId: votes.chosenBookExternalId,
                voteCount: count(),
            })
            .from(votes)
            .where(eq(votes.voteRoundId, round.id))
            .groupBy(votes.chosenBookExternalId);

        const countByExternalId = new Map(
            voteCounts.map((r) => [r.chosenBookExternalId, Number(r.voteCount)]),
        );

        const booksWithCounts: LatestVoteBook[] = books
            .map((b) => ({
                externalId: b.externalId,
                title: b.title,
                author: b.author,
                coverUrl: b.coverUrl,
                coverOptions: b.coverUrl ? [b.coverUrl] : [],
                blurb: b.blurb,
                link: b.link,
                voteCount: countByExternalId.get(b.externalId) ?? 0,
            }))
            .sort((a, b) => b.voteCount - a.voteCount);

        return NextResponse.json({
            round: {
                id: round.id,
                meetingDate: round.meetingDate,
            },
            books: booksWithCounts,
        });
    } catch (err) {
        console.error('Latest vote books error:', err);
        return NextResponse.json(
            { error: 'Failed to fetch vote books' },
            { status: 500 },
        );
    }
}
