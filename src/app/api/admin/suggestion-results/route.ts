import { NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { suggestionRounds, suggestions } from '@/db/schema';
import { requireAdmin } from '@/lib/admin-auth';

export type SuggestionResultItem = {
    bookExternalId: string;
    title: string | null;
    author: string | null;
    suggestionCount: number;
};

export type SuggestionResultsRound = {
    id: number;
    suggestionsForDate: string | null;
    closeAt: string | null;
    results: SuggestionResultItem[];
};

/**
 * GET: Admin only. Returns all suggestion rounds with tally per book
 * (unique books, count of suggestions each), ordered by created desc (most recent first).
 */
export async function GET(request: Request) {
    const authError = await requireAdmin(request);
    if (authError) return authError;

    if (!db) {
        return NextResponse.json(
            { error: 'Database not configured' },
            { status: 503 },
        );
    }

    try {
        const rounds = await db
            .select({
                id: suggestionRounds.id,
                suggestionsForDate: suggestionRounds.suggestionsForDate,
                closeAt: suggestionRounds.closeAt,
            })
            .from(suggestionRounds)
            .orderBy(desc(suggestionRounds.createdAt));

        const result: SuggestionResultsRound[] = [];

        for (const round of rounds) {
            const rows = await db
                .select({
                    bookExternalId: suggestions.bookExternalId,
                    title: suggestions.title,
                    author: suggestions.author,
                })
                .from(suggestions)
                .where(eq(suggestions.suggestionRoundId, round.id));

            const byBook = new Map<
                string,
                { title: string | null; author: string | null; count: number }
            >();
            for (const r of rows) {
                const existing = byBook.get(r.bookExternalId);
                if (!existing) {
                    byBook.set(r.bookExternalId, {
                        title: r.title ?? null,
                        author: r.author ?? null,
                        count: 1,
                    });
                } else {
                    existing.count += 1;
                }
            }

            const results: SuggestionResultItem[] = Array.from(
                byBook.entries(),
            ).map(([bookExternalId, { title, author, count }]) => ({
                bookExternalId,
                title,
                author,
                suggestionCount: count,
            }));

            result.push({
                id: round.id,
                suggestionsForDate: round.suggestionsForDate ?? null,
                closeAt: round.closeAt?.toISOString() ?? null,
                results,
            });
        }

        return NextResponse.json({ rounds: result });
    } catch (err) {
        console.error('Suggestion results fetch error:', err);
        return NextResponse.json(
            { error: 'Failed to fetch suggestion results' },
            { status: 500 },
        );
    }
}
