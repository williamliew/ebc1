import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { suggestions } from '@/db/schema';
import { requireAdmin } from '@/lib/admin-auth';

/**
 * PATCH: Admin only. Update a suggestion (e.g. approve thumbnail override).
 * Body: { coverUrlOverrideApproved?: boolean }
 */
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const authError = await requireAdmin(request);
    if (authError) return authError;

    if (!db) {
        return NextResponse.json(
            { error: 'Database not configured' },
            { status: 503 },
        );
    }

    const { id: idParam } = await params;
    const id = parseInt(idParam, 10);
    if (Number.isNaN(id) || id < 1) {
        return NextResponse.json(
            { error: 'Invalid suggestion id' },
            { status: 400 },
        );
    }

    let body: { coverUrlOverrideApproved?: boolean };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json(
            { error: 'Invalid JSON body' },
            { status: 400 },
        );
    }

    if (typeof body.coverUrlOverrideApproved !== 'boolean') {
        return NextResponse.json(
            { error: 'coverUrlOverrideApproved must be a boolean' },
            { status: 400 },
        );
    }

    try {
        const [updated] = await db
            .update(suggestions)
            .set({ coverUrlOverrideApproved: body.coverUrlOverrideApproved })
            .where(eq(suggestions.id, id))
            .returning({ id: suggestions.id });

        if (!updated) {
            return NextResponse.json(
                { error: 'Suggestion not found' },
                { status: 404 },
            );
        }

        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error('Approve suggestion cover error:', err);
        return NextResponse.json(
            { error: 'Failed to update suggestion' },
            { status: 500 },
        );
    }
}

/**
 * DELETE: Admin only. Removes a single suggestion from the database.
 */
export async function DELETE(
    _request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const authError = await requireAdmin(_request);
    if (authError) return authError;

    if (!db) {
        return NextResponse.json(
            { error: 'Database not configured' },
            { status: 503 },
        );
    }

    const { id: idParam } = await params;
    const id = parseInt(idParam, 10);
    if (Number.isNaN(id) || id < 1) {
        return NextResponse.json(
            { error: 'Invalid suggestion id' },
            { status: 400 },
        );
    }

    try {
        const deleted = await db
            .delete(suggestions)
            .where(eq(suggestions.id, id))
            .returning({ id: suggestions.id });

        if (deleted.length === 0) {
            return NextResponse.json(
                { error: 'Suggestion not found' },
                { status: 404 },
            );
        }

        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error('Delete suggestion error:', err);
        return NextResponse.json(
            { error: 'Failed to delete suggestion' },
            { status: 500 },
        );
    }
}
