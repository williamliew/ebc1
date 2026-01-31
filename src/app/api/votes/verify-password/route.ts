import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { voteRounds } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { createVoteAccessCookie } from '@/lib/vote-access';

const bodySchema = z.object({
    roundId: z.number().int().positive(),
    password: z.string().min(1),
});

/**
 * POST: verify vote access password for a round. On success sets HttpOnly cookie and returns ok.
 */
export async function POST(request: Request) {
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
            id: voteRounds.id,
            closeVoteAt: voteRounds.closeVoteAt,
            voteAccessPassword: voteRounds.voteAccessPassword,
        })
        .from(voteRounds)
        .where(eq(voteRounds.id, parsed.data.roundId))
        .limit(1);

    if (!round) {
        return NextResponse.json(
            { error: 'Vote round not found' },
            { status: 404 },
        );
    }

    if (!round.voteAccessPassword) {
        return NextResponse.json(
            { error: 'This round has no access password' },
            { status: 400 },
        );
    }

    const isOpen =
        !round.closeVoteAt || new Date(round.closeVoteAt) > new Date();
    if (!isOpen) {
        return NextResponse.json(
            { error: 'Voting has closed for this round' },
            { status: 400 },
        );
    }

    if (parsed.data.password !== round.voteAccessPassword) {
        return NextResponse.json(
            { error: 'Incorrect password' },
            { status: 401 },
        );
    }

    const cookie = await createVoteAccessCookie(round.id);
    const res = NextResponse.json({ ok: true });
    res.headers.set('Set-Cookie', cookie);
    return res;
}
