import { and, desc, eq, isNotNull } from 'drizzle-orm';
import { db } from '@/db';
import { nominationRounds, nominationBooks } from '@/db/schema';

export async function getNextBook() {
    if (!db) return { winner: null, meetingDate: null };

    const [roundWithWinner] = await db
        .select()
        .from(nominationRounds)
        .where(isNotNull(nominationRounds.winnerBookId))
        .orderBy(desc(nominationRounds.meetingDate))
        .limit(1);

    if (!roundWithWinner?.winnerBookId) {
        return { winner: null, meetingDate: null };
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

    if (!winnerBook) return { winner: null, meetingDate: null };

    return {
        winner: {
            id: winnerBook.id,
            title: winnerBook.title,
            author: winnerBook.author,
            coverUrl: winnerBook.coverUrl,
            blurb: winnerBook.blurb,
            link: winnerBook.link,
        },
        meetingDate: roundWithWinner.meetingDate,
    };
}
