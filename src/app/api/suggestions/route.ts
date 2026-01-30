import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { suggestions } from '@/db/schema';
import { eq, sql, and } from 'drizzle-orm';

const MAX_SUGGESTIONS_PER_PERSON = 2;

const keyHashSchema = z.string().min(1, 'Key hash required').max(256);

const postBodySchema = z.object({
    suggestionRoundId: z.number().int().positive(),
    bookExternalId: z.string().min(1).max(256),
    suggesterKeyHash: keyHashSchema,
});

export async function GET(request: Request) {
    if (!db) {
        return NextResponse.json(
            { error: 'Database not configured' },
            { status: 503 },
        );
    }

    const { searchParams } = new URL(request.url);
    const roundId = searchParams.get('roundId');
    const tally = searchParams.get('tally') === '1';

    if (!roundId) {
        return NextResponse.json(
            { error: 'roundId query required' },
            { status: 400 },
        );
    }

    const roundIdNum = parseInt(roundId, 10);
    if (Number.isNaN(roundIdNum)) {
        return NextResponse.json(
            { error: 'roundId must be a number' },
            { status: 400 },
        );
    }

    try {
        if (tally) {
            const rows = await db
                .select({
                    bookExternalId: suggestions.bookExternalId,
                    count: sql<number>`count(*)::int`,
                })
                .from(suggestions)
                .where(eq(suggestions.suggestionRoundId, roundIdNum))
                .groupBy(suggestions.bookExternalId);

            return NextResponse.json({
                roundId: roundIdNum,
                tally: rows.map((r) => ({
                    bookExternalId: r.bookExternalId,
                    count: r.count,
                })),
            });
        }

        const list = await db
            .select({
                id: suggestions.id,
                suggestionRoundId: suggestions.suggestionRoundId,
                bookExternalId: suggestions.bookExternalId,
                createdAt: suggestions.createdAt,
            })
            .from(suggestions)
            .where(eq(suggestions.suggestionRoundId, roundIdNum));

        return NextResponse.json({ roundId: roundIdNum, suggestions: list });
    } catch (err) {
        console.error('Fetch suggestions error:', err);
        return NextResponse.json(
            { error: 'Failed to fetch suggestions' },
            { status: 500 },
        );
    }
}

export async function POST(request: Request) {
    if (!db) {
        return NextResponse.json(
            { error: 'Database not configured' },
            { status: 503 },
        );
    }

    const parsed = postBodySchema.safeParse(await request.json());
    if (!parsed.success) {
        return NextResponse.json(
            { error: 'Invalid request', details: parsed.error.flatten() },
            { status: 400 },
        );
    }

    try {
        const count = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(suggestions)
            .where(
                and(
                    eq(
                        suggestions.suggestionRoundId,
                        parsed.data.suggestionRoundId,
                    ),
                    eq(
                        suggestions.suggesterKeyHash,
                        parsed.data.suggesterKeyHash,
                    ),
                ),
            );

        const current = count[0]?.count ?? 0;
        if (current >= MAX_SUGGESTIONS_PER_PERSON) {
            return NextResponse.json(
                {
                    error: `Maximum ${MAX_SUGGESTIONS_PER_PERSON} suggestions per person per round`,
                },
                { status: 400 },
            );
        }

        const [row] = await db
            .insert(suggestions)
            .values({
                suggestionRoundId: parsed.data.suggestionRoundId,
                bookExternalId: parsed.data.bookExternalId,
                suggesterKeyHash: parsed.data.suggesterKeyHash,
            })
            .returning({
                id: suggestions.id,
                suggestionRoundId: suggestions.suggestionRoundId,
                bookExternalId: suggestions.bookExternalId,
                createdAt: suggestions.createdAt,
            });

        if (!row) {
            return NextResponse.json(
                { error: 'Failed to add suggestion' },
                { status: 500 },
            );
        }

        return NextResponse.json({ suggestion: row });
    } catch (err) {
        console.error('Add suggestion error:', err);
        return NextResponse.json(
            { error: 'Failed to add suggestion' },
            { status: 500 },
        );
    }
}
