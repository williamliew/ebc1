import { NextResponse } from 'next/server';
import { desc, or, isNull, gt } from 'drizzle-orm';
import { db } from '@/db';
import {
    voteRounds,
    suggestionRounds,
    bookOfTheMonth,
} from '@/db/schema';
import { sanitiseBlurb } from '@/lib/sanitize-blurb';

const MAX_CACHE_SECONDS = 60; // Cap: never cache "open" for more than 1 minute (so admin changes show quickly)

/**
 * GET /api/status
 *
 * Combined home status: vote open?, suggestions open?, current book.
 * Public, no auth. Safe for caching: Cache-Control max-age is set so the
 * response is never used past a vote/suggestion round's end time, so we
 * never show "open" when the round has closed.
 */
export async function GET() {
    if (!db) {
        return NextResponse.json(
            { error: 'Database not configured' },
            { status: 503 },
        );
    }

    const now = new Date();
    let validUntil = new Date(now.getTime() + MAX_CACHE_SECONDS * 1000);

    try {
        // --- Vote: latest round, open if closeVoteAt is null or in the future ---
        const [voteRound] = await db
            .select({
                id: voteRounds.id,
                meetingDate: voteRounds.meetingDate,
                closeVoteAt: voteRounds.closeVoteAt,
            })
            .from(voteRounds)
            .orderBy(desc(voteRounds.meetingDate))
            .limit(1);

        const voteOpen = voteRound
            ? !voteRound.closeVoteAt ||
              new Date(voteRound.closeVoteAt) > now
            : false;
        if (voteOpen && voteRound?.closeVoteAt) {
            const closeAt = new Date(voteRound.closeVoteAt);
            if (closeAt < validUntil) validUntil = closeAt;
        }

        // --- Suggestions: current round (closeAt null or in the future) ---
        const [suggestionRound] = await db
            .select({
                id: suggestionRounds.id,
                suggestionsForDate: suggestionRounds.suggestionsForDate,
                closeAt: suggestionRounds.closeAt,
            })
            .from(suggestionRounds)
            .where(
                or(
                    isNull(suggestionRounds.closeAt),
                    gt(suggestionRounds.closeAt, now),
                ),
            )
            .orderBy(desc(suggestionRounds.id))
            .limit(1);

        const suggestionsOpen = !!suggestionRound;
        if (suggestionsOpen && suggestionRound?.closeAt) {
            const closeAt = new Date(suggestionRound.closeAt);
            if (closeAt < validUntil) validUntil = closeAt;
        }

        // --- Current book (latest by meeting date) ---
        const [currentBook] = await db
            .select({
                meetingDate: bookOfTheMonth.meetingDate,
                title: bookOfTheMonth.title,
                author: bookOfTheMonth.author,
                coverUrl: bookOfTheMonth.coverUrl,
                blurb: bookOfTheMonth.blurb,
            })
            .from(bookOfTheMonth)
            .orderBy(desc(bookOfTheMonth.meetingDate))
            .limit(1);

        const body = {
            voteOpen,
            voteRoundId: voteRound?.id ?? null,
            voteCloseAt: voteRound?.closeVoteAt?.toISOString() ?? null,
            suggestionsOpen,
            suggestionRoundId: suggestionRound?.id ?? null,
            suggestionsCloseAt: suggestionRound?.closeAt?.toISOString() ?? null,
            currentBook: currentBook
                ? {
                      title: currentBook.title,
                      author: currentBook.author,
                      meetingDate: currentBook.meetingDate,
                      coverUrl: currentBook.coverUrl ?? null,
                      blurb: currentBook.blurb
                          ? sanitiseBlurb(currentBook.blurb)
                          : null,
                  }
                : null,
        };

        // Safe max-age: never past validUntil (round end times)
        const secondsUntilValid = Math.max(
            0,
            Math.floor((validUntil.getTime() - now.getTime()) / 1000),
        );
        const maxAge = Math.min(secondsUntilValid, MAX_CACHE_SECONDS);

        return NextResponse.json(body, {
            headers: {
                'Cache-Control':
                    maxAge > 0
                        ? `public, max-age=${maxAge}, s-maxage=${maxAge}`
                        : 'public, max-age=0, must-revalidate',
            },
        });
    } catch (err) {
        console.error('Status API error:', err);
        return NextResponse.json(
            { error: 'Failed to fetch status' },
            { status: 500, headers: { 'Cache-Control': 'no-store' } },
        );
    }
}
