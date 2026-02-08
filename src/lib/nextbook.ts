import { desc, eq, and } from 'drizzle-orm';
import { db } from '@/db';
import { bookOfTheMonth, voteRounds, voteRoundBooks } from '@/db/schema';
import { getOpenLibraryBooksDetails } from '@/lib/open-library';

export type PastBook = {
    meetingDate: string;
    title: string;
    author: string;
    coverUrl: string | null;
};

export async function getNextBook(): Promise<{
    winner: {
        externalId: string;
        title: string;
        author: string;
        coverUrl: string | null;
        blurb: string | null;
        link: string | null;
    } | null;
    meetingDate: string | null;
    pastBooks: PastBook[];
}> {
    if (!db)
        return { winner: null, meetingDate: null, pastBooks: [] };

    try {
        // Book of the month: all rows by latest meeting date first
        const allBotm = await db
            .select({
                meetingDate: bookOfTheMonth.meetingDate,
                externalId: bookOfTheMonth.externalId,
                title: bookOfTheMonth.title,
                author: bookOfTheMonth.author,
                coverUrl: bookOfTheMonth.coverUrl,
                blurb: bookOfTheMonth.blurb,
                link: bookOfTheMonth.link,
            })
            .from(bookOfTheMonth)
            .orderBy(desc(bookOfTheMonth.meetingDate));

        const [current, ...pastRows] = allBotm;
        const pastBooks: PastBook[] = pastRows.map((row) => ({
            meetingDate: row.meetingDate,
            title: row.title,
            author: row.author,
            coverUrl: row.coverUrl,
        }));

        if (current) {
            const winner = {
                externalId: current.externalId,
                title: current.title,
                author: current.author,
                coverUrl: current.coverUrl,
                blurb: current.blurb,
                link: current.link,
            };
            return {
                winner,
                meetingDate: current.meetingDate,
                pastBooks,
            };
        }

        // Fallback: latest vote round winner
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
            return { winner: null, meetingDate, pastBooks };
        }

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
            return { winner, meetingDate, pastBooks };
        }

        const details = await getOpenLibraryBooksDetails([winnerId]);
        const winner = details[0] ?? null;
        return { winner, meetingDate, pastBooks };
    } catch {
        return { winner: null, meetingDate: null, pastBooks: [] };
    }
}
