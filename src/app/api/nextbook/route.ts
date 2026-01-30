import { NextResponse } from 'next/server';
import { desc, isNotNull } from 'drizzle-orm';
import { db } from '@/db';
import { monthlyBook } from '@/db/schema';
import { getBookDetails } from '@/lib/google-books';

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
            .from(monthlyBook)
            .where(isNotNull(monthlyBook.winnerExternalId))
            .orderBy(desc(monthlyBook.meetingDate))
            .limit(1);

        if (!roundWithWinner?.winnerExternalId) {
            return NextResponse.json({ winner: null, meetingDate: null });
        }

        const winner = await getBookDetails(roundWithWinner.winnerExternalId);
        if (!winner) {
            return NextResponse.json({ winner: null, meetingDate: null });
        }

        return NextResponse.json({
            winner: {
                id: winner.externalId,
                title: winner.title,
                author: winner.author,
                coverUrl: winner.coverUrl,
                blurb: winner.blurb,
                link: winner.link,
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
