import { NextResponse } from 'next/server';
import { z } from 'zod';
import { checkRateLimit } from '@/lib/rate-limit';
import {
    getBlurbFromGemini,
    hasGeminiApiKey,
} from '@/lib/gemini';
import { sanitiseBlurb } from '@/lib/sanitize-blurb';

const bodySchema = z.object({
    title: z.string().min(1).max(500),
    author: z.string().min(1).max(500),
});

const BLURB_AI_RATE_LIMIT_PER_MINUTE = 20;

export async function POST(request: Request) {
    const rateLimitRes = checkRateLimit(
        request,
        'books-blurb-from-ai',
        BLURB_AI_RATE_LIMIT_PER_MINUTE,
    );
    if (rateLimitRes) return rateLimitRes;

    if (!hasGeminiApiKey()) {
        return NextResponse.json(
            {
                error:
                    'Gemini API key not configured. Set GEMINI_API_KEY or GOOGLE_API_KEY in .env.local.',
            },
            { status: 503 },
        );
    }

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
        return NextResponse.json(
            { error: 'Invalid request', details: parsed.error.flatten() },
            { status: 400 },
        );
    }

    const { title, author } = parsed.data;
    const result = await getBlurbFromGemini(title, author);
    if (!result) {
        return NextResponse.json(
            {
                error:
                    'Could not get blurb from AI. Check the server logs for Gemini API errors.',
            },
            { status: 502 },
        );
    }

    const sanitised = sanitiseBlurb(result.blurb);
    return NextResponse.json({
        blurb: sanitised,
        source: result.source,
    });
}
