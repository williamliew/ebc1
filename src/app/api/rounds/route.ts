import { NextResponse } from 'next/server';
import { desc } from 'drizzle-orm';
import { db } from '@/db';
import { nominationRounds } from '@/db/schema';

export async function GET() {
    if (!db) {
        return NextResponse.json(
            { error: 'Database not configured' },
            { status: 503 },
        );
    }

    try {
        const rounds = await db
            .select({
                id: nominationRounds.id,
                meetingDate: nominationRounds.meetingDate,
                winnerBookId: nominationRounds.winnerBookId,
                createdAt: nominationRounds.createdAt,
            })
            .from(nominationRounds)
            .orderBy(desc(nominationRounds.meetingDate));

        return NextResponse.json({ rounds });
    } catch (err) {
        console.error('Fetch rounds error:', err);
        return NextResponse.json(
            { error: 'Failed to fetch rounds' },
            { status: 500 },
        );
    }
}
