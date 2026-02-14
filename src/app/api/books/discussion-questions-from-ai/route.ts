import { NextResponse } from 'next/server';
import { z } from 'zod';
import { checkRateLimit } from '@/lib/rate-limit';
import {
    getDiscussionQuestionsFromGemini,
    hasGeminiApiKey,
} from '@/lib/gemini';
import { sanitiseBlurb } from '@/lib/sanitize-blurb';

const bodySchema = z.object({
    title: z.string().min(1).max(500),
    author: z.string().min(1).max(500),
});

const RATE_LIMIT_PER_MINUTE = 20;

export async function POST(request: Request) {
    const rateLimitRes = checkRateLimit(
        request,
        'books-discussion-questions-from-ai',
        RATE_LIMIT_PER_MINUTE,
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
    const html = await getDiscussionQuestionsFromGemini(title, author);
    if (!html) {
        return NextResponse.json(
            {
                error:
                    'Could not get discussion questions from AI. Check the server logs for Gemini API errors.',
            },
            { status: 502 },
        );
    }

    const sanitised = sanitiseBlurb(html);
    return NextResponse.json({ questions: sanitised });
}
