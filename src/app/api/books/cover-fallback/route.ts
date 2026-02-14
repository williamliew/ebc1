import { NextResponse } from 'next/server';
import { z } from 'zod';
import { checkRateLimit } from '@/lib/rate-limit';
import { getBookCoverUrl } from '@/lib/book-cover';

const bodySchema = z.object({
    title: z.string().min(1).max(500),
    author: z.string().min(1).max(500),
});

const COVER_FALLBACK_RATE_LIMIT_PER_MINUTE = 30;

/**
 * Longitood-only cover lookup. Use when a search result has no cover or the cover image failed to load.
 * Returns a cover URL if Longitood finds one.
 */
export async function POST(request: Request) {
    const rateLimitRes = checkRateLimit(
        request,
        'books-cover-fallback',
        COVER_FALLBACK_RATE_LIMIT_PER_MINUTE,
    );
    if (rateLimitRes) return rateLimitRes;

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
        return NextResponse.json(
            { error: 'Invalid request', details: parsed.error.flatten() },
            { status: 400 },
        );
    }

    const { title, author } = parsed.data;
    const coverUrl = await getBookCoverUrl(title, author);
    return NextResponse.json({ coverUrl: coverUrl ?? null });
}
