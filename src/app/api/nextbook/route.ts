import { NextResponse } from 'next/server';
import { and, desc, eq, isNotNull } from 'drizzle-orm';
import { db } from '@/db';
import { nominationRounds, nominationBooks } from '@/db/schema';

export async function GET() {
    if (!db) {
        return NextResponse.json(
            { error: 'Database not configured' },
            { status: 503 },
        );
    }

    try {
        const [roundWithWinner] = await db
            .select()
            .from(nominationRounds)
            .where(isNotNull(nominationRounds.winnerBookId))
            .orderBy(desc(nominationRounds.meetingDate))
            .limit(1);

        if (!roundWithWinner?.winnerBookId) {
            return NextResponse.json({ winner: null, meetingDate: null });
        }

        const [winnerBook] = await db
            .select()
            .from(nominationBooks)
            .where(
                and(
                    eq(nominationBooks.id, roundWithWinner.winnerBookId),
                    eq(nominationBooks.roundId, roundWithWinner.id),
                ),
            )
            .limit(1);

        if (!winnerBook) {
            return NextResponse.json({ winner: null, meetingDate: null });
        }

        return NextResponse.json({
            winner: {
                id: winnerBook.id,
                title: winnerBook.title,
                author: winnerBook.author,
                coverUrl: winnerBook.coverUrl,
                blurb: winnerBook.blurb,
                link: winnerBook.link,
            },
            meetingDate: roundWithWinner.meetingDate,
        });
    } catch (err) {
        console.error('Fetch nextbook error:', err);
        return NextResponse.json(
            { error: 'Failed to fetch next book' },
            { status: 500 },
        );
    }
}
