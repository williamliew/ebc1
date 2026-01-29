import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { nominationRounds, nominationBooks } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';

const meetingDateSchema = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD');

const createBodySchema = z.object({
    meetingDate: meetingDateSchema,
    books: z
        .array(
            z.object({
                externalId: z.string(),
                title: z.string(),
                author: z.string(),
                coverUrl: z.string().nullable(),
                blurb: z.string().nullable(),
                link: z.string().nullable(),
            }),
        )
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
            .insert(nominationRounds)
            .values({
                meetingDate: parsed.data.meetingDate,
            })
            .returning({ id: nominationRounds.id, meetingDate: nominationRounds.meetingDate });

        if (!round) {
            return NextResponse.json(
                { error: 'Failed to create round' },
                { status: 500 },
            );
        }

        await db.insert(nominationBooks).values(
            parsed.data.books.map((b) => ({
                roundId: round.id,
                externalId: b.externalId,
                title: b.title,
                author: b.author,
                coverUrl: b.coverUrl,
                blurb: b.blurb,
                link: b.link,
            })),
        );

        return NextResponse.json({
            roundId: round.id,
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

    try {
        type RoundRow = {
            id: number;
            meetingDate: string;
            createdAt: Date;
            winnerBookId: number | null;
        };
        let round: RoundRow | undefined;

        if (dateParam) {
            const rows = await db
                .select()
                .from(nominationRounds)
                .where(eq(nominationRounds.meetingDate, dateParam))
                .limit(1);
            round = rows[0] as RoundRow | undefined;
        } else {
            const rows = await db
                .select()
                .from(nominationRounds)
                .orderBy(desc(nominationRounds.meetingDate))
                .limit(1);
            round = rows[0] as RoundRow | undefined;
        }

        if (!round) {
            return NextResponse.json({ round: null, books: [] });
        }

        const books = await db
            .select()
            .from(nominationBooks)
            .where(eq(nominationBooks.roundId, round.id));

        return NextResponse.json({
            round: {
                id: round.id,
                meetingDate: round.meetingDate,
                createdAt: round.createdAt,
                winnerBookId: round.winnerBookId ?? null,
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
    winnerBookId: z.number().int().positive(),
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
            .from(nominationRounds)
            .where(eq(nominationRounds.meetingDate, parsed.data.meetingDate))
            .limit(1);

        if (!round) {
            return NextResponse.json(
                { error: 'Round not found for this meeting date' },
                { status: 404 },
            );
        }

        const [book] = await db
            .select()
            .from(nominationBooks)
            .where(eq(nominationBooks.id, parsed.data.winnerBookId))
            .limit(1);

        if (!book || book.roundId !== round.id) {
            return NextResponse.json(
                { error: 'Book not found or does not belong to this round' },
                { status: 400 },
            );
        }

        await db
            .update(nominationRounds)
            .set({ winnerBookId: parsed.data.winnerBookId })
            .where(eq(nominationRounds.id, round.id));

        return NextResponse.json({
            meetingDate: round.meetingDate,
            winnerBookId: parsed.data.winnerBookId,
        });
    } catch (err) {
        console.error('Set winner error:', err);
        return NextResponse.json(
            { error: 'Failed to set winner' },
            { status: 500 },
        );
    }
}
