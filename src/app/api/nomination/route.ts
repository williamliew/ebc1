import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { monthlyBook, monthlyBookSelections } from '@/db/schema';
import { and, desc, eq } from 'drizzle-orm';
import { getBooksDetails } from '@/lib/google-books';

const meetingDateSchema = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD');

const createBodySchema = z.object({
    meetingDate: meetingDateSchema,
    books: z
        .array(z.object({ externalId: z.string() }))
        .min(2)
        .max(4),
});

export async function POST(request: Request) {
    if (!db) {
        return NextResponse.json(
            { error: 'Database not configured' },
            { status: 503 },
        );
    }

    const parsed = createBodySchema.safeParse(await request.json());
    if (!parsed.success) {
        return NextResponse.json(
            { error: 'Invalid request', details: parsed.error.flatten() },
            { status: 400 },
        );
    }

    try {
        const [round] = await db
            .insert(monthlyBook)
            .values({
                meetingDate: parsed.data.meetingDate,
            })
            .returning({
                id: monthlyBook.id,
                meetingDate: monthlyBook.meetingDate,
            });

        if (!round) {
            return NextResponse.json(
                { error: 'Failed to create round' },
                { status: 500 },
            );
        }

        await db.insert(monthlyBookSelections).values(
            parsed.data.books.map((b) => ({
                monthlyBookId: round.id,
                meetingDate: round.meetingDate,
                externalId: b.externalId,
            })),
        );

        return NextResponse.json({
            monthlyBookId: round.id,
            meetingDate: round.meetingDate,
        });
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : '';
        if (msg.includes('unique') || msg.includes('duplicate')) {
            return NextResponse.json(
                { error: 'A round for this meeting date already exists' },
                { status: 409 },
            );
        }
        console.error('Create nomination error:', err);
        return NextResponse.json(
            { error: 'Failed to create nomination round' },
            { status: 500 },
        );
    }
}

export async function GET(request: Request) {
    if (!db) {
        return NextResponse.json(
            { error: 'Database not configured' },
            { status: 503 },
        );
    }

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    const expand = searchParams.get('expand') !== '0';

    try {
        type RoundRow = {
            id: number;
            meetingDate: string;
            createdAt: Date;
            winnerExternalId: string | null;
        };
        let round: RoundRow | undefined;

        if (dateParam) {
            const rows = await db
                .select()
                .from(monthlyBook)
                .where(eq(monthlyBook.meetingDate, dateParam))
                .limit(1);
            round = rows[0] as RoundRow | undefined;
        } else {
            const rows = await db
                .select()
                .from(monthlyBook)
                .orderBy(desc(monthlyBook.meetingDate))
                .limit(1);
            round = rows[0] as RoundRow | undefined;
        }

        if (!round) {
            return NextResponse.json({ round: null, books: [] });
        }

        const selections = await db
            .select()
            .from(monthlyBookSelections)
            .where(eq(monthlyBookSelections.monthlyBookId, round.id));

        const books = expand
            ? await getBooksDetails(selections.map((s) => s.externalId))
            : selections.map((s) => ({ externalId: s.externalId }));

        return NextResponse.json({
            round: {
                id: round.id,
                meetingDate: round.meetingDate,
                createdAt: round.createdAt,
                winnerExternalId: round.winnerExternalId ?? null,
            },
            books,
        });
    } catch (err) {
        console.error('Fetch nomination error:', err);
        return NextResponse.json(
            { error: 'Failed to fetch nomination' },
            { status: 500 },
        );
    }
}

const setWinnerBodySchema = z.object({
    meetingDate: meetingDateSchema,
    winnerExternalId: z.string().min(1),
});

export async function PATCH(request: Request) {
    if (!db) {
        return NextResponse.json(
            { error: 'Database not configured' },
            { status: 503 },
        );
    }

    const parsed = setWinnerBodySchema.safeParse(await request.json());
    if (!parsed.success) {
        return NextResponse.json(
            { error: 'Invalid request', details: parsed.error.flatten() },
            { status: 400 },
        );
    }

    try {
        const [round] = await db
            .select()
            .from(monthlyBook)
            .where(eq(monthlyBook.meetingDate, parsed.data.meetingDate))
            .limit(1);

        if (!round) {
            return NextResponse.json(
                { error: 'Round not found for this meeting date' },
                { status: 404 },
            );
        }

        const [selection] = await db
            .select()
            .from(monthlyBookSelections)
            .where(
                and(
                    eq(monthlyBookSelections.monthlyBookId, round.id),
                    eq(
                        monthlyBookSelections.externalId,
                        parsed.data.winnerExternalId,
                    ),
                ),
            )
            .limit(1);

        if (!selection) {
            return NextResponse.json(
                {
                    error: 'Book not found or does not belong to this round (use Google Books volume ID)',
                },
                { status: 400 },
            );
        }

        await db
            .update(monthlyBook)
            .set({ winnerExternalId: parsed.data.winnerExternalId })
            .where(eq(monthlyBook.id, round.id));

        return NextResponse.json({
            meetingDate: round.meetingDate,
            winnerExternalId: parsed.data.winnerExternalId,
        });
    } catch (err) {
        console.error('Set winner error:', err);
        return NextResponse.json(
            { error: 'Failed to set winner' },
            { status: 500 },
        );
    }
}
