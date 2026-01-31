import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { suggestionRounds } from '@/db/schema';
import { desc } from 'drizzle-orm';
import { requireAdmin } from '@/lib/admin-auth';

const createBodySchema = z.object({
    label: z.string().max(64).optional(),
    closeAt: z.string().datetime().optional(),
});

export async function GET() {
    if (!db) {
        return NextResponse.json(
            { error: 'Database not configured' },
            { status: 503 },
        );
    }

    try {
        const rounds = await db
            .select({
                id: suggestionRounds.id,
                label: suggestionRounds.label,
                closeAt: suggestionRounds.closeAt,
                createdAt: suggestionRounds.createdAt,
            })
            .from(suggestionRounds)
            .orderBy(desc(suggestionRounds.createdAt));

        return NextResponse.json({ rounds });
    } catch (err) {
        console.error('Fetch suggestion rounds error:', err);
        return NextResponse.json(
            { error: 'Failed to fetch suggestion rounds' },
            { status: 500 },
        );
    }
}

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
        const [round] = await db
            .insert(suggestionRounds)
            .values({
                label: parsed.data.label ?? null,
                closeAt: parsed.data.closeAt
                    ? new Date(parsed.data.closeAt)
                    : null,
            })
            .returning({
                id: suggestionRounds.id,
                label: suggestionRounds.label,
                closeAt: suggestionRounds.closeAt,
                createdAt: suggestionRounds.createdAt,
            });

        if (!round) {
            return NextResponse.json(
                { error: 'Failed to create suggestion round' },
                { status: 500 },
            );
        }

        return NextResponse.json({ round });
    } catch (err) {
        console.error('Create suggestion round error:', err);
        return NextResponse.json(
            { error: 'Failed to create suggestion round' },
            { status: 500 },
        );
    }
}
