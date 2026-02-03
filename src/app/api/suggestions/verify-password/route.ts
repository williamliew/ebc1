import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { suggestionRounds } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { createSuggestionAccessCookie } from '@/lib/suggestion-access';
import { checkRateLimit } from '@/lib/rate-limit';

const bodySchema = z.object({
    roundId: z.number().int().positive(),
    password: z.string().min(1),
});

const VERIFY_PASSWORD_RATE_LIMIT_PER_MINUTE = 10;

/**
 * POST: verify suggestion round access password. On success sets HttpOnly cookie and returns ok.
 */
export async function POST(request: Request) {
    const rateLimitRes = checkRateLimit(
        request,
        'suggestion-verify-password',
        VERIFY_PASSWORD_RATE_LIMIT_PER_MINUTE,
    );
    if (rateLimitRes) return rateLimitRes;

    if (!db) {
        return NextResponse.json(
            { error: 'Database not configured' },
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

    const [round] = await db
        .select({
            id: suggestionRounds.id,
            closeAt: suggestionRounds.closeAt,
            suggestionAccessPassword: suggestionRounds.suggestionAccessPassword,
        })
        .from(suggestionRounds)
        .where(eq(suggestionRounds.id, parsed.data.roundId))
        .limit(1);

    if (!round) {
        return NextResponse.json(
            { error: 'Suggestion round not found' },
            { status: 404 },
        );
    }

    if (!round.suggestionAccessPassword) {
        return NextResponse.json(
            { error: 'This round has no access password' },
            { status: 400 },
        );
    }

    const now = new Date();
    const isOpen = !round.closeAt || new Date(round.closeAt) > now;
    if (!isOpen) {
        return NextResponse.json(
            { error: 'Suggestions have closed for this round' },
            { status: 400 },
        );
    }

    if (parsed.data.password !== round.suggestionAccessPassword) {
        return NextResponse.json(
            { error: 'Incorrect password' },
            { status: 401 },
        );
    }

    const cookie = await createSuggestionAccessCookie(round.id);
    const res = NextResponse.json({ ok: true });
    res.headers.set('Set-Cookie', cookie);
    return res;
}
