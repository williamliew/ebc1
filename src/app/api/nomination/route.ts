import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { voteRounds, voteRoundBooks } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
import { getOpenLibraryBooksDetails } from '@/lib/open-library';
import { getBookCoverUrl } from '@/lib/book-cover';
import { requireAdmin } from '@/lib/admin-auth';

const meetingDateSchema = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD');

const createBodySchema = z.object({
    meetingDate: meetingDateSchema,
    closeVoteDate: meetingDateSchema.optional(),
    voteAccessPassword: z.string().max(256).optional(),
    books: z
        .array(z.object({ externalId: z.string() }))
        .min(2)
        .max(4),
});

export async function POST(request: Request) {
    const authError = await requireAdmin(request);
    if (authError) return authError;

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
        const selectedBookIds = parsed.data.books.map((b) => b.externalId);
        const details = await getOpenLibraryBooksDetails(selectedBookIds);

        const closeVoteAt = parsed.data.closeVoteDate
            ? new Date(parsed.data.closeVoteDate + 'T23:59:59Z')
            : null;

        const [round] = await db
            .insert(voteRounds)
            .values({
                meetingDate: parsed.data.meetingDate,
                closeVoteAt,
                selectedBookIds,
                voteAccessPassword:
                    parsed.data.voteAccessPassword?.trim() || null,
            })
            .returning({
                id: voteRounds.id,
                meetingDate: voteRounds.meetingDate,
            });

        if (!round) {
            return NextResponse.json(
                { error: 'Failed to create round' },
                { status: 500 },
            );
        }

        const coverUrls = await Promise.all(
            selectedBookIds.map(async (externalId) => {
                const d = details.find((b) => b.externalId === externalId);
                const title = d?.title ?? 'Unknown title';
                const author = d?.author ?? 'Unknown author';
                const longitood = await getBookCoverUrl(title, author);
                const final = longitood ?? d?.coverUrl ?? null;
                if (longitood) {
                    console.log(
                        `[nomination] Longitood cover used: ${title} / ${author}`,
                    );
                } else {
                    console.log(
                        `[nomination] Longitood no cover, using Open Library fallback: ${title} / ${author}`,
                    );
                }
                return final;
            }),
        );

        const bookRows = selectedBookIds.map((externalId, i) => {
            const d = details.find((b) => b.externalId === externalId);
            return {
                voteRoundId: round.id,
                externalId,
                title: d?.title ?? 'Unknown title',
                author: d?.author ?? 'Unknown author',
                coverUrl: coverUrls[i] ?? null,
                blurb: d?.blurb ?? null,
                link: d?.link ?? null,
            };
        });
        await db.insert(voteRoundBooks).values(bookRows);

        return NextResponse.json({
            voteRoundId: round.id,
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
        let round:
            | { id: number; meetingDate: string; closeVoteAt: Date | null }
            | undefined;

        if (dateParam) {
            const rows = await db
                .select({
                    id: voteRounds.id,
                    meetingDate: voteRounds.meetingDate,
                    closeVoteAt: voteRounds.closeVoteAt,
                })
                .from(voteRounds)
                .where(eq(voteRounds.meetingDate, dateParam))
                .limit(1);
            round = rows[0];
        } else {
            const rows = await db
                .select({
                    id: voteRounds.id,
                    meetingDate: voteRounds.meetingDate,
                    closeVoteAt: voteRounds.closeVoteAt,
                })
                .from(voteRounds)
                .orderBy(desc(voteRounds.meetingDate))
                .limit(1);
            round = rows[0];
        }

        if (!round) {
            return NextResponse.json({ round: null, books: [] });
        }

        const cached = await db
            .select()
            .from(voteRoundBooks)
            .where(eq(voteRoundBooks.voteRoundId, round.id));

        const books = expand
            ? cached.map((b) => ({
                  externalId: b.externalId,
                  title: b.title,
                  author: b.author,
                  coverUrl: b.coverUrl,
                  blurb: b.blurb,
                  link: b.link,
              }))
            : cached.map((b) => ({ externalId: b.externalId }));

        const selectedBookIds = cached.map((b) => b.externalId);

        return NextResponse.json({
            round: {
                id: round.id,
                meetingDate: round.meetingDate,
                closeVoteAt: round.closeVoteAt?.toISOString() ?? null,
                selectedBookIds,
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

const updateSelectedBooksBodySchema = z.object({
    meetingDate: meetingDateSchema,
    selectedBookIds: z.array(z.string().min(1)).min(2).max(4),
});

export async function PATCH(request: Request) {
    if (!db) {
        return NextResponse.json(
            { error: 'Database not configured' },
            { status: 503 },
        );
    }

    const parsed = updateSelectedBooksBodySchema.safeParse(
        await request.json(),
    );
    if (!parsed.success) {
        return NextResponse.json(
            { error: 'Invalid request', details: parsed.error.flatten() },
            { status: 400 },
        );
    }

    try {
        const [round] = await db
            .select()
            .from(voteRounds)
            .where(eq(voteRounds.meetingDate, parsed.data.meetingDate))
            .limit(1);

        if (!round) {
            return NextResponse.json(
                { error: 'Round not found for this meeting date' },
                { status: 404 },
            );
        }

        await db
            .update(voteRounds)
            .set({ selectedBookIds: parsed.data.selectedBookIds })
            .where(eq(voteRounds.id, round.id));

        return NextResponse.json({
            meetingDate: round.meetingDate,
            selectedBookIds: parsed.data.selectedBookIds,
        });
    } catch (err) {
        console.error('Update selected books error:', err);
        return NextResponse.json(
            { error: 'Failed to update selected books' },
            { status: 500 },
        );
    }
}
