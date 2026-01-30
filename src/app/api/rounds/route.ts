import { NextResponse } from 'next/server';
import { desc } from 'drizzle-orm';
import { db } from '@/db';
import { monthlyBook } from '@/db/schema';

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
                id: monthlyBook.id,
                meetingDate: monthlyBook.meetingDate,
                winnerExternalId: monthlyBook.winnerExternalId,
                createdAt: monthlyBook.createdAt,
            })
            .from(monthlyBook)
            .orderBy(desc(monthlyBook.meetingDate));

        return NextResponse.json({ rounds });
    } catch (err) {
        console.error('Fetch rounds error:', err);
        return NextResponse.json(
            { error: 'Failed to fetch rounds' },
            { status: 500 },
        );
    }
}
