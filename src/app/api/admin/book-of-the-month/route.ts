import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { desc } from 'drizzle-orm';
import { db } from '@/db';
import { bookOfTheMonth } from '@/db/schema';
import { requireAdmin } from '@/lib/admin-auth';

/**
 * GET: Admin only. Returns the book of the month with the latest meeting date.
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
        const [row] = await db
            .select()
            .from(bookOfTheMonth)
            .orderBy(desc(bookOfTheMonth.meetingDate))
            .limit(1);

        if (!row) {
            return NextResponse.json({
                book: null,
                meetingDate: null,
            });
        }

        return NextResponse.json({
            book: {
                externalId: row.externalId,
                title: row.title,
                author: row.author,
                coverUrl: row.coverUrl,
                blurb: row.blurb,
                link: row.link,
            },
            meetingDate: row.meetingDate,
        });
    } catch (err) {
        console.error('Book of the month GET error:', err);
        return NextResponse.json(
            { error: 'Failed to fetch book of the month' },
            { status: 500 },
        );
    }
}

/**
 * POST: Admin only. Set the book of the month (creates a new entry).
 */
export async function POST(request: Request) {
    const authError = await requireAdmin(request);
    if (authError) return authError;

    if (!db) {
        return NextResponse.json(
            { error: 'Database not configured' },
            { status: 503 },
        );
    }

    let body: {
        meetingDate: string;
        externalId: string;
        title: string;
        author: string;
        coverUrl?: string | null;
        blurb?: string | null;
        link?: string | null;
    };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json(
            { error: 'Invalid JSON body' },
            { status: 400 },
        );
    }

    const {
        meetingDate,
        externalId,
        title,
        author,
        coverUrl = null,
        blurb = null,
        link = null,
    } = body;

    if (!meetingDate || !externalId || !title || !author) {
        return NextResponse.json(
            {
                error:
                    'Missing required fields: meetingDate, externalId, title, author',
            },
            { status: 400 },
        );
    }

    try {
        const [inserted] = await db
            .insert(bookOfTheMonth)
            .values({
                meetingDate,
                externalId,
                title,
                author,
                coverUrl: coverUrl ?? null,
                blurb: blurb ?? null,
                link: link ?? null,
            })
            .returning({ id: bookOfTheMonth.id });

        revalidatePath('/');
        revalidatePath('/nextbook');
        revalidatePath('/api/status');

        return NextResponse.json({
            id: inserted?.id,
            meetingDate,
            message: 'Book of the month set',
        });
    } catch (err) {
        console.error('Book of the month POST error:', err);
        return NextResponse.json(
            { error: 'Failed to set book of the month' },
            { status: 500 },
        );
    }
}
