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
        const rounds = await db
            .select({
                id: voteRounds.id,
                meetingDate: voteRounds.meetingDate,
                selectedBookIds: voteRounds.selectedBookIds,
                createdAt: voteRounds.createdAt,
            })
            .from(voteRounds)
            .orderBy(desc(voteRounds.meetingDate));

        return NextResponse.json({ rounds });
    } catch (err) {
        console.error('Fetch rounds error:', err);
        return NextResponse.json(
            { error: 'Failed to fetch rounds' },
            { status: 500 },
        );
    }
}
