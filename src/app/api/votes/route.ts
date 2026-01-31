import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { voteRounds, votes, voteRoundBooks } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
import { verifyVoteAccessCookie } from '@/lib/vote-access';

const keyHashSchema = z.string().min(1, 'Key hash required').max(256);

const postBodySchema = z.object({
    voteRoundId: z.number().int().positive().optional(),
    chosenBookExternalId: z.string().min(1).max(256),
    voterKeyHash: keyHashSchema,
});

/**
 * GET: current open vote round (latest with closeVoteAt in the future or null).
 * Optional ?roundId= to fetch a specific round.
 */
export async function GET(request: Request) {
    if (!db) {
        return NextResponse.json(
            { error: 'Database not configured' },
            { status: 503 },
        );
    }

    const { searchParams } = new URL(request.url);
    const roundIdParam = searchParams.get('roundId');

    try {
        if (roundIdParam) {
            const roundId = parseInt(roundIdParam, 10);
            if (Number.isNaN(roundId)) {
                return NextResponse.json(
                    { error: 'roundId must be a number' },
                    { status: 400 },
                );
            }
            const [round] = await db
                .select()
                .from(voteRounds)
                .where(eq(voteRounds.id, roundId))
                .limit(1);
            if (!round) {
                return NextResponse.json(
                    { error: 'Vote round not found' },
                    { status: 404 },
                );
            }
            const isOpen =
                !round.closeVoteAt || new Date(round.closeVoteAt) > new Date();
            const requiresPassword =
                !!round.voteAccessPassword &&
                round.voteAccessPassword.length > 0;
            const cookie = request.headers.get('cookie');
            const allowed =
                !requiresPassword ||
                (await verifyVoteAccessCookie(round.id, cookie));

            const books = allowed
                ? await db
                      .select()
                      .from(voteRoundBooks)
                      .where(eq(voteRoundBooks.voteRoundId, round.id))
                : [];

            return NextResponse.json({
                round: {
                    id: round.id,
                    meetingDate: round.meetingDate,
                    closeVoteAt: round.closeVoteAt?.toISOString() ?? null,
                    selectedBookIds: round.selectedBookIds,
                    winnerExternalId: round.winnerExternalId ?? null,
                    isOpen,
                    requiresPassword: requiresPassword && !allowed,
                },
                books,
            });
        }

        const allRounds = await db
            .select()
            .from(voteRounds)
            .orderBy(desc(voteRounds.meetingDate));

        const latestRound = allRounds[0] ?? null;
        if (!latestRound) {
            return NextResponse.json({
                round: null,
                books: [],
            });
        }

        const now = new Date();
        const isOpen =
            !latestRound.closeVoteAt || new Date(latestRound.closeVoteAt) > now;
        const requiresPassword =
            !!latestRound.voteAccessPassword &&
            latestRound.voteAccessPassword.length > 0;
        const cookie = request.headers.get('cookie');
        const allowed =
            !requiresPassword ||
            (await verifyVoteAccessCookie(latestRound.id, cookie));

        const books = allowed
            ? await db
                  .select()
                  .from(voteRoundBooks)
                  .where(eq(voteRoundBooks.voteRoundId, latestRound.id))
            : [];

        return NextResponse.json({
            round: {
                id: latestRound.id,
                meetingDate: latestRound.meetingDate,
                closeVoteAt: latestRound.closeVoteAt?.toISOString() ?? null,
                selectedBookIds: latestRound.selectedBookIds,
                winnerExternalId: latestRound.winnerExternalId ?? null,
                isOpen,
                requiresPassword: requiresPassword && !allowed,
            },
            books,
        });
    } catch (err) {
        console.error('Fetch vote round error:', err);
        return NextResponse.json(
            { error: 'Failed to fetch vote round' },
            { status: 500 },
        );
    }
}

/**
 * POST: cast a vote. Uses voteRoundId if provided, otherwise current open round.
 * One vote per voterKeyHash per round (enforced by DB unique).
 */
export async function POST(request: Request) {
    if (!db) {
        return NextResponse.json(
            { error: 'Database not configured' },
            { status: 503 },
        );
    }

    const parsed = postBodySchema.safeParse(await request.json());
    if (!parsed.success) {
        return NextResponse.json(
            { error: 'Invalid request', details: parsed.error.flatten() },
            { status: 400 },
        );
    }

    try {
        let voteRoundId: number;

        if (parsed.data.voteRoundId != null) {
            const [round] = await db
                .select({
                    id: voteRounds.id,
                    closeVoteAt: voteRounds.closeVoteAt,
                    selectedBookIds: voteRounds.selectedBookIds,
                })
                .from(voteRounds)
                .where(eq(voteRounds.id, parsed.data.voteRoundId))
                .limit(1);
            if (!round) {
                return NextResponse.json(
                    { error: 'Vote round not found' },
                    { status: 404 },
                );
            }
            if (
                round.closeVoteAt &&
                new Date(round.closeVoteAt) <= new Date()
            ) {
                return NextResponse.json(
                    { error: 'Voting has closed for this round' },
                    { status: 400 },
                );
            }
            if (
                !round.selectedBookIds.includes(
                    parsed.data.chosenBookExternalId,
                )
            ) {
                return NextResponse.json(
                    { error: 'Chosen book is not in this round shortlist' },
                    { status: 400 },
                );
            }
            voteRoundId = round.id;
        } else {
            const [openRound] = await db
                .select()
                .from(voteRounds)
                .orderBy(desc(voteRounds.meetingDate))
                .limit(1);
            if (!openRound) {
                return NextResponse.json(
                    { error: 'No vote round available' },
                    { status: 404 },
                );
            }
            if (
                openRound.closeVoteAt &&
                new Date(openRound.closeVoteAt) <= new Date()
            ) {
                return NextResponse.json(
                    { error: 'Voting has closed for this round' },
                    { status: 400 },
                );
            }
            if (
                !openRound.selectedBookIds.includes(
                    parsed.data.chosenBookExternalId,
                )
            ) {
                return NextResponse.json(
                    { error: 'Chosen book is not in this round shortlist' },
                    { status: 400 },
                );
            }
            voteRoundId = openRound.id;
        }

        const [row] = await db
            .insert(votes)
            .values({
                voteRoundId,
                chosenBookExternalId: parsed.data.chosenBookExternalId,
                voterKeyHash: parsed.data.voterKeyHash,
            })
            .returning({
                id: votes.id,
                voteRoundId: votes.voteRoundId,
                chosenBookExternalId: votes.chosenBookExternalId,
                createdAt: votes.createdAt,
            });

        if (!row) {
            return NextResponse.json(
                { error: 'Failed to record vote' },
                { status: 500 },
            );
        }

        return NextResponse.json({ vote: row });
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : '';
        if (msg.includes('votes_round_voter') || msg.includes('unique')) {
            return NextResponse.json(
                { error: 'You have already voted in this round' },
                { status: 409 },
            );
        }
        console.error('Cast vote error:', err);
        return NextResponse.json(
            { error: 'Failed to record vote' },
            { status: 500 },
        );
    }
}
