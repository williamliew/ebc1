import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { suggestions } from '@/db/schema';
import { eq, sql, and } from 'drizzle-orm';

const MAX_SUGGESTIONS_PER_PERSON = 2;

const keyHashSchema = z.string().min(1, 'Key hash required').max(256);

const SUGGESTER_KEY_HASH_HEADER = 'x-suggester-key-hash';

const optionalUrl = z
    .union([z.string().url(), z.literal(''), z.null()])
    .optional()
    .transform((v) => (v === '' || v === undefined ? null : v));

const postBodySchema = z.object({
    suggestionRoundId: z.number().int().positive(),
    bookExternalId: z.string().min(1).max(256),
    suggesterKeyHash: keyHashSchema,
    title: z
        .string()
        .max(512)
        .transform((s) => s.trim() || 'Unknown title'),
    author: z
        .string()
        .max(512)
        .transform((s) => s.trim() || 'Unknown author'),
    coverUrl: optionalUrl,
    blurb: z.string().nullable().optional(),
    link: optionalUrl,
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
                suggesterKeyHash: suggestions.suggesterKeyHash,
                title: suggestions.title,
                author: suggestions.author,
                coverUrl: suggestions.coverUrl,
                blurb: suggestions.blurb,
                link: suggestions.link,
                createdAt: suggestions.createdAt,
            })
            .from(suggestions)
            .where(eq(suggestions.suggestionRoundId, roundIdNum));

        const suggesterKeyHash = request.headers.get(SUGGESTER_KEY_HASH_HEADER);
        const myHash =
            keyHashSchema.safeParse(suggesterKeyHash?.trim() ?? '').data ??
            null;

        const userCount =
            myHash !== null
                ? ((
                      await db
                          .select({
                              count: sql<number>`count(*)::int`,
                          })
                          .from(suggestions)
                          .where(
                              and(
                                  eq(suggestions.suggestionRoundId, roundIdNum),
                                  eq(suggestions.suggesterKeyHash, myHash),
                              ),
                          )
                  )[0]?.count ?? 0)
                : 0;

        const suggestionsWithMe = list.map((s) => ({
            id: s.id,
            suggestionRoundId: s.suggestionRoundId,
            bookExternalId: s.bookExternalId,
            title: s.title,
            author: s.author,
            coverUrl: s.coverUrl,
            blurb: s.blurb,
            link: s.link,
            createdAt: s.createdAt,
            suggestedByMe: myHash !== null && s.suggesterKeyHash === myHash,
        }));

        return NextResponse.json({
            roundId: roundIdNum,
            suggestions: suggestionsWithMe,
            userSuggestionCount: userCount,
        });
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
        const first = parsed.error.errors[0];
        const message = first?.message ?? 'Invalid request';
        return NextResponse.json(
            { error: message, details: parsed.error.flatten() },
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

        const [existingSameBook] = await db
            .select({ id: suggestions.id })
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
                    eq(suggestions.bookExternalId, parsed.data.bookExternalId),
                ),
            )
            .limit(1);
        if (existingSameBook) {
            return NextResponse.json(
                { error: 'You have already suggested this book in this round' },
                { status: 400 },
            );
        }

        const [row] = await db
            .insert(suggestions)
            .values({
                suggestionRoundId: parsed.data.suggestionRoundId,
                bookExternalId: parsed.data.bookExternalId,
                suggesterKeyHash: parsed.data.suggesterKeyHash,
                title: parsed.data.title,
                author: parsed.data.author,
                coverUrl: parsed.data.coverUrl ?? null,
                blurb: parsed.data.blurb ?? null,
                link: parsed.data.link ?? null,
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
