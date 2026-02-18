import { NextResponse } from 'next/server';
import { asc, desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { suggestionRounds, suggestions } from '@/db/schema';
import { requireAdmin } from '@/lib/admin-auth';

export type SuggestionResultItem = {
    bookExternalId: string;
    title: string | null;
    author: string | null;
    suggestionCount: number;
};

export type SuggestionListItem = {
    id: number;
    bookExternalId: string;
    createdAt: string;
    title: string | null;
    author: string | null;
    coverUrl: string | null;
    coverUrlOverrideApproved: boolean;
    comment: string | null;
    commenterName: string | null;
    blurb: string | null;
    /** True when this is a manual entry not yet approved; it will not appear on the public list until approved. */
    manualPendingApproval: boolean;
};

export type SuggestionResultsRound = {
    id: number;
    suggestionsForDate: string | null;
    closeAt: string | null;
    results: SuggestionResultItem[];
    items: SuggestionListItem[];
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
                    id: suggestions.id,
                    bookExternalId: suggestions.bookExternalId,
                    title: suggestions.title,
                    author: suggestions.author,
                    coverUrl: suggestions.coverUrl,
                    coverUrlOverrideApproved: suggestions.coverUrlOverrideApproved,
                    comment: suggestions.comment,
                    commenterName: suggestions.commenterName,
                    blurb: suggestions.blurb,
                    manualPendingApproval: suggestions.manualPendingApproval,
                    createdAt: suggestions.createdAt,
                })
                .from(suggestions)
                .where(eq(suggestions.suggestionRoundId, round.id))
                .orderBy(asc(suggestions.createdAt));

            const byBook = new Map<
                string,
                { title: string | null; author: string | null; count: number }
            >();
            for (const r of rows) {
                if (r.manualPendingApproval) continue;
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

            const items: SuggestionListItem[] = rows.map((r) => ({
                id: r.id,
                bookExternalId: r.bookExternalId,
                createdAt:
                    r.createdAt instanceof Date
                        ? r.createdAt.toISOString()
                        : String(r.createdAt),
                title: r.title ?? null,
                author: r.author ?? null,
                coverUrl: r.coverUrl ?? null,
                coverUrlOverrideApproved: r.coverUrlOverrideApproved,
                comment: r.comment ?? null,
                commenterName: r.commenterName ?? null,
                blurb: r.blurb ?? null,
                manualPendingApproval: r.manualPendingApproval,
            }));

            result.push({
                id: round.id,
                suggestionsForDate: round.suggestionsForDate ?? null,
                closeAt: round.closeAt?.toISOString() ?? null,
                results,
                items,
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
