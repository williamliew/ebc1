import { desc, eq, and } from 'drizzle-orm';
import { db } from '@/db';
import { voteRounds, voteRoundBooks } from '@/db/schema';
import { getBooksDetails } from '@/lib/google-books';

export async function getNextBook() {
    if (!db) return { winner: null, meetingDate: null };

    try {
        const [latestRound] = await db
            .select({
                id: voteRounds.id,
                meetingDate: voteRounds.meetingDate,
                winnerExternalId: voteRounds.winnerExternalId,
            })
            .from(voteRounds)
            .orderBy(desc(voteRounds.meetingDate))
            .limit(1);

        const winnerId = latestRound?.winnerExternalId ?? null;
        const meetingDate = latestRound?.meetingDate ?? null;

        if (!winnerId || !latestRound) {
            return { winner: null, meetingDate };
        }

        // Prefer cache (vote_round_books) to avoid Google Books API quota
        const [cached] = await db
            .select()
            .from(voteRoundBooks)
            .where(
                and(
                    eq(voteRoundBooks.voteRoundId, latestRound.id),
                    eq(voteRoundBooks.externalId, winnerId),
                ),
            )
            .limit(1);

        if (cached) {
            const winner = {
                externalId: cached.externalId,
                title: cached.title,
                author: cached.author,
                coverUrl: cached.coverUrl,
                blurb: cached.blurb,
                link: cached.link,
            };
            return { winner, meetingDate };
        }

        // Fallback if winner was set but not in cache (e.g. legacy data)
        const details = await getBooksDetails([winnerId]);
        const winner = details[0] ?? null;

        return { winner, meetingDate };
    } catch {
        return { winner: null, meetingDate: null };
    }
}
