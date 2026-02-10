import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { suggestionRounds } from '@/db/schema';
import { desc, gt, or, isNull } from 'drizzle-orm';
import { requireAdmin } from '@/lib/admin-auth';
import { verifySuggestionAccessCookie } from '@/lib/suggestion-access';

const createBodySchema = z.object({
    suggestionsForDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional(),
    label: z.string().max(64).optional(),
    closeAt: z.string().datetime().optional(),
    suggestionAccessPassword: z.string().max(256).optional(),
});

export async function GET(request: Request) {
    if (!db) {
        return NextResponse.json(
            { error: 'Database not configured' },
            { status: 503 },
        );
    }

    const { searchParams } = new URL(request.url);
    const currentOnly = searchParams.get('current') === '1';

    try {
        if (currentOnly) {
            const now = new Date();
            const [round] = await db
                .select({
                    id: suggestionRounds.id,
                    suggestionsForDate: suggestionRounds.suggestionsForDate,
                    label: suggestionRounds.label,
                    closeAt: suggestionRounds.closeAt,
                    suggestionAccessPassword:
                        suggestionRounds.suggestionAccessPassword,
                    createdAt: suggestionRounds.createdAt,
                })
                .from(suggestionRounds)
                .where(
                    or(
                        isNull(suggestionRounds.closeAt),
                        gt(suggestionRounds.closeAt, now),
                    ),
                )
                .orderBy(desc(suggestionRounds.createdAt))
                .limit(1);

            if (!round) {
                return NextResponse.json({ round: null });
            }

            const requiresPassword =
                !!round.suggestionAccessPassword &&
                round.suggestionAccessPassword.length > 0;
            const cookie = request.headers.get('cookie');
            const allowed =
                !requiresPassword ||
                (await verifySuggestionAccessCookie(round.id, cookie));

            return NextResponse.json({
                round: {
                    id: round.id,
                    suggestionsForDate: round.suggestionsForDate ?? null,
                    label: round.label ?? null,
                    closeAt: round.closeAt?.toISOString() ?? null,
                    requiresPassword: requiresPassword && !allowed,
                },
            });
        }

        const rounds = await db
            .select({
                id: suggestionRounds.id,
                suggestionsForDate: suggestionRounds.suggestionsForDate,
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
                suggestionsForDate: parsed.data.suggestionsForDate ?? null,
                label: parsed.data.label ?? null,
                closeAt: parsed.data.closeAt
                    ? new Date(parsed.data.closeAt)
                    : null,
                suggestionAccessPassword:
                    parsed.data.suggestionAccessPassword?.trim() || null,
            })
            .returning({
                id: suggestionRounds.id,
                suggestionsForDate: suggestionRounds.suggestionsForDate,
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

        revalidatePath('/');
        revalidatePath('/suggestnextbook');
        revalidatePath('/api/status');

        return NextResponse.json({ round });
    } catch (err) {
        console.error('Create suggestion round error:', err);
        return NextResponse.json(
            { error: 'Failed to create suggestion round' },
            { status: 500 },
        );
    }
}
