import { desc, isNotNull } from 'drizzle-orm';
import { db } from '@/db';
import { monthlyBook } from '@/db/schema';
import { getBookDetails } from '@/lib/google-books';

export async function getNextBook() {
    if (!db) return { winner: null, meetingDate: null };

    const [roundWithWinner] = await db
        .select()
        .from(monthlyBook)
        .where(isNotNull(monthlyBook.winnerExternalId))
        .orderBy(desc(monthlyBook.meetingDate))
        .limit(1);

    if (!roundWithWinner?.winnerExternalId) {
        return { winner: null, meetingDate: null };
    }

    const winner = await getBookDetails(roundWithWinner.winnerExternalId);
    if (!winner) return { winner: null, meetingDate: null };

    return {
        winner: {
            id: winner.externalId,
            title: winner.title,
            author: winner.author,
            coverUrl: winner.coverUrl,
            blurb: winner.blurb,
            link: winner.link,
        },
        meetingDate: roundWithWinner.meetingDate,
    };
}
