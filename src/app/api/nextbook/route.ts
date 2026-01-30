import { NextResponse } from 'next/server';
import { desc } from 'drizzle-orm';
import { db } from '@/db';
import { voteRounds } from '@/db/schema';

export async function GET() {
    if (!db) {
        return NextResponse.json(
            { error: 'Database not configured' },
            { status: 503 },
        );
    }

    try {
        const [latestRound] = await db
            .select({
                meetingDate: voteRounds.meetingDate,
                winnerExternalId: voteRounds.winnerExternalId,
            })
            .from(voteRounds)
            .orderBy(desc(voteRounds.meetingDate))
            .limit(1);

        return NextResponse.json({
            winner: latestRound?.winnerExternalId ?? null,
            meetingDate: latestRound?.meetingDate ?? null,
        });
    } catch (err) {
        console.error('Fetch nextbook error:', err);
        return NextResponse.json(
            { error: 'Failed to fetch next book' },
            { status: 500 },
        );
    }
}
