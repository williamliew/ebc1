import { NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { suggestionRounds, suggestions } from '@/db/schema';
import { requireAdmin } from '@/lib/admin-auth';

const TOP_N = 6;

export type TopSuggestionBook = {
    externalId: string;
    title: string;
    author: string;
    coverUrl: string | null;
    coverOptions: string[];
    blurb: string | null;
    link: string | null;
};

/**
 * GET: Admin only. Returns the latest suggestion round and the top N most-suggested
 * books (by count), with full details for use in create-a-vote.
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
        const [round] = await db
            .select({
                id: suggestionRounds.id,
                suggestionsForDate: suggestionRounds.suggestionsForDate,
            })
            .from(suggestionRounds)
            .orderBy(desc(suggestionRounds.id))
            .limit(1);

        if (!round) {
            return NextResponse.json({
                round: null,
                books: [],
            });
        }

        const rows = await db
            .select({
                bookExternalId: suggestions.bookExternalId,
                title: suggestions.title,
                author: suggestions.author,
                coverUrl: suggestions.coverUrl,
                blurb: suggestions.blurb,
                link: suggestions.link,
            })
            .from(suggestions)
            .where(eq(suggestions.suggestionRoundId, round.id));

        const byBook = new Map<
            string,
            {
                title: string | null;
                author: string | null;
                coverUrl: string | null;
                blurb: string | null;
                link: string | null;
                count: number;
            }
        >();
        for (const r of rows) {
            const key = r.bookExternalId;
            const existing = byBook.get(key);
            if (!existing) {
                byBook.set(key, {
                    title: r.title ?? null,
                    author: r.author ?? null,
                    coverUrl: r.coverUrl ?? null,
                    blurb: r.blurb ?? null,
                    link: r.link ?? null,
                    count: 1,
                });
            } else {
                existing.count += 1;
            }
        }

        const sorted = Array.from(byBook.entries())
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, TOP_N);

        const books: TopSuggestionBook[] = sorted.map(
            ([externalId, { title, author, coverUrl, blurb, link }]) => ({
                externalId,
                title: title ?? 'Unknown title',
                author: author ?? 'Unknown author',
                coverUrl,
                coverOptions: coverUrl ? [coverUrl] : [],
                blurb,
                link,
            }),
        );

        return NextResponse.json({
            round: {
                id: round.id,
                suggestionsForDate: round.suggestionsForDate ?? null,
            },
            books,
        });
    } catch (err) {
        console.error('Latest suggestion top books error:', err);
        return NextResponse.json(
            { error: 'Failed to fetch suggestion books' },
            { status: 500 },
        );
    }
}
