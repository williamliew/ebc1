import { NextResponse } from 'next/server';
import { z } from 'zod';
import { checkRateLimit } from '@/lib/rate-limit';
import { getCanonicalBookForCover } from '@/lib/gemini';
import { getBookCoverUrl } from '@/lib/book-cover';

const bodySchema = z.object({
    title: z.string().min(1).max(500),
    author: z.string().min(1).max(500),
});

const COVER_AI_RATE_LIMIT_PER_MINUTE = 20;

export async function POST(request: Request) {
    const rateLimitRes = checkRateLimit(
        request,
        'books-cover-from-ai',
        COVER_AI_RATE_LIMIT_PER_MINUTE,
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
    const canonical = await getCanonicalBookForCover(title, author);
    const searchTitle = canonical?.title ?? title;
    const searchAuthor = canonical?.author ?? author;

    const coverUrl = await getBookCoverUrl(searchTitle, searchAuthor);
    return NextResponse.json({
        coverUrl: coverUrl ?? null,
    });
}
