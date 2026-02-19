import { NextResponse } from 'next/server';
import { z } from 'zod';
import { randomBytes } from 'crypto';
import { db } from '@/db';
import { suggestions } from '@/db/schema';
import { eq, sql, and } from 'drizzle-orm';
import { sanitiseSuggestionComment } from '@/lib/sanitize-suggestion-comment';
import { sanitiseBlurb } from '@/lib/sanitize-blurb';
import { checkRateLimit } from '@/lib/rate-limit';
import { censorProfanity } from '@/lib/censor-profanity';

const SUGGESTIONS_POST_RATE_LIMIT_PER_MINUTE = 20;

const MAX_SUGGESTIONS_PER_PERSON = 2;
/** Max plain-text character count for suggestion comment (after stripping HTML). */
const MAX_COMMENT_CHARS = 350;
const MAX_COMMENT_HTML_LENGTH = 4000;

const keyHashSchema = z.string().min(1, 'Key hash required').max(256);

const SUGGESTER_KEY_HASH_HEADER = 'x-suggester-key-hash';

const optionalUrl = z
    .union([z.string().url(), z.literal(''), z.null()])
    .optional()
    .transform((v) => (v === '' || v === undefined ? null : v));

const optionalComment = z
    .string()
    .max(MAX_COMMENT_HTML_LENGTH)
    .optional()
    .transform((v) => (v == null || v.trim() === '' ? undefined : v.trim()));

const MAX_COMMENTER_NAME_LENGTH = 128;
const optionalCommenterName = z
    .string()
    .max(MAX_COMMENTER_NAME_LENGTH)
    .nullable()
    .optional()
    .transform((v) =>
        v == null || typeof v !== 'string' || v.trim() === '' ? null : v.trim(),
    );

const postBodySchema = z.object({
    suggestionRoundId: z.number().int().positive(),
    bookExternalId: z.string().min(1).max(256),
    suggesterKeyHash: keyHashSchema,
    title: z
        .string()
        .max(512)
        .transform((s) => s.trim() || 'Unknown title'),
    author: z
        .string()
        .max(512)
        .transform((s) => s.trim() || 'Unknown author'),
    coverUrl: optionalUrl,
    /** When true, the submitted coverUrl is a user override (custom URL). It will be stored but not shown publicly until approved. */
    coverUrlIsOverride: z.boolean().optional(),
    blurb: z.string().nullable().optional(),
    link: optionalUrl,
    comment: optionalComment,
    commenterName: optionalCommenterName,
});

const manualEntryBodySchema = z.object({
    manualEntry: z.literal(true),
    suggestionRoundId: z.number().int().positive(),
    suggesterKeyHash: keyHashSchema,
    title: z.string().min(1, 'Title is required').max(512).transform((s) => s.trim()),
    author: z.string().min(1, 'Author is required').max(512).transform((s) => s.trim()),
    coverUrl: optionalUrl,
    blurb: z.string().nullable().optional(),
    comment: optionalComment,
    commenterName: optionalCommenterName,
});

export async function GET(request: Request) {
    if (!db) {
        return NextResponse.json(
            { error: 'Database not configured' },
            { status: 503 },
        );
    }

    const { searchParams } = new URL(request.url);
    const roundId = searchParams.get('roundId');
    const tally = searchParams.get('tally') === '1';

    if (!roundId) {
        return NextResponse.json(
            { error: 'roundId query required' },
            { status: 400 },
        );
    }

    const roundIdNum = parseInt(roundId, 10);
    if (Number.isNaN(roundIdNum)) {
        return NextResponse.json(
            { error: 'roundId must be a number' },
            { status: 400 },
        );
    }

    try {
        if (tally) {
            const rows = await db
                .select({
                    bookExternalId: suggestions.bookExternalId,
                    count: sql<number>`count(*)::int`,
                })
                .from(suggestions)
                .where(
                    and(
                        eq(suggestions.suggestionRoundId, roundIdNum),
                        eq(suggestions.manualPendingApproval, false),
                    ),
                )
                .groupBy(suggestions.bookExternalId);

            return NextResponse.json({
                roundId: roundIdNum,
                tally: rows.map((r) => ({
                    bookExternalId: r.bookExternalId,
                    count: r.count,
                })),
            });
        }

        const list = await db
            .select({
                id: suggestions.id,
                suggestionRoundId: suggestions.suggestionRoundId,
                bookExternalId: suggestions.bookExternalId,
                suggesterKeyHash: suggestions.suggesterKeyHash,
                title: suggestions.title,
                author: suggestions.author,
                coverUrl: suggestions.coverUrl,
                coverUrlOverrideApproved: suggestions.coverUrlOverrideApproved,
                blurb: suggestions.blurb,
                link: suggestions.link,
                comment: suggestions.comment,
                commenterName: suggestions.commenterName,
                manualPendingApproval: suggestions.manualPendingApproval,
                createdAt: suggestions.createdAt,
            })
            .from(suggestions)
            .where(
                and(
                    eq(suggestions.suggestionRoundId, roundIdNum),
                    eq(suggestions.manualPendingApproval, false),
                ),
            );

        const suggesterKeyHash = request.headers.get(SUGGESTER_KEY_HASH_HEADER);
        const myHash =
            keyHashSchema.safeParse(suggesterKeyHash?.trim() ?? '').data ??
            null;

        const userCount =
            myHash !== null
                ? ((
                      await db
                          .select({
                              count: sql<number>`count(*)::int`,
                          })
                          .from(suggestions)
                          .where(
                              and(
                                  eq(suggestions.suggestionRoundId, roundIdNum),
                                  eq(suggestions.suggesterKeyHash, myHash),
                              ),
                          )
                  )[0]?.count ?? 0)
                : 0;

        const hasPendingManualEntry =
            myHash !== null
                ? ((
                      await db
                          .select({
                              count: sql<number>`count(*)::int`,
                          })
                          .from(suggestions)
                          .where(
                              and(
                                  eq(suggestions.suggestionRoundId, roundIdNum),
                                  eq(suggestions.suggesterKeyHash, myHash),
                                  eq(suggestions.manualPendingApproval, true),
                              ),
                          )
                  )[0]?.count ?? 0) > 0
                : false;

        const suggestionsWithMe = list.map((s) => ({
            id: s.id,
            suggestionRoundId: s.suggestionRoundId,
            bookExternalId: s.bookExternalId,
            title: s.title,
            author: s.author,
            coverUrl: s.coverUrl,
            coverUrlOverrideApproved: s.coverUrlOverrideApproved,
            blurb: s.blurb,
            link: s.link,
            comment: s.comment ?? null,
            commenterName: s.commenterName ?? null,
            createdAt: s.createdAt,
            suggestedByMe: myHash !== null && s.suggesterKeyHash === myHash,
        }));

        return NextResponse.json({
            roundId: roundIdNum,
            suggestions: suggestionsWithMe,
            userSuggestionCount: userCount,
            hasPendingManualEntry,
        });
    } catch (err) {
        console.error('Fetch suggestions error:', err);
        return NextResponse.json(
            { error: 'Failed to fetch suggestions' },
            { status: 500 },
        );
    }
}

type ManualEntryData = z.infer<typeof manualEntryBodySchema>;

async function handleManualEntry(
    data: ManualEntryData,
): Promise<NextResponse> {
    if (!db) {
        return NextResponse.json(
            { error: 'Database not configured' },
            { status: 503 },
        );
    }
    try {
        const count = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(suggestions)
            .where(
                and(
                    eq(suggestions.suggestionRoundId, data.suggestionRoundId),
                    eq(suggestions.suggesterKeyHash, data.suggesterKeyHash),
                ),
            );
        const current = count[0]?.count ?? 0;
        if (current >= MAX_SUGGESTIONS_PER_PERSON) {
            return NextResponse.json(
                {
                    error: `Maximum ${MAX_SUGGESTIONS_PER_PERSON} suggestions per person per round`,
                },
                { status: 400 },
            );
        }

        let commentValue: string | null = null;
        if (data.comment != null && data.comment !== '') {
            const plainForCount = data.comment
                .replace(/<[^>]*>/g, ' ')
                .replace(/\r\n|\r|\n/g, ' ')
                .trim();
            const charCount = plainForCount.length;
            if (charCount > MAX_COMMENT_CHARS) {
                return NextResponse.json(
                    {
                        error: `Comment must be ${MAX_COMMENT_CHARS} characters or fewer (you have ${charCount})`,
                    },
                    { status: 400 },
                );
            }
            commentValue = sanitiseSuggestionComment(data.comment);
            if (commentValue !== '') {
                commentValue = censorProfanity(commentValue);
                if (commentValue === '') commentValue = null;
            } else {
                commentValue = null;
            }
        }

        const commenterNameValue =
            data.commenterName == null || data.commenterName === ''
                ? null
                : data.commenterName
                      .replace(/<[^>]*>/g, '')
                      .trim()
                      .slice(0, MAX_COMMENTER_NAME_LENGTH) || null;

        const bookExternalId = `manual-${data.suggestionRoundId}-${Date.now()}-${randomBytes(4).toString('hex')}`;
        const coverUrlOverrideApproved = data.coverUrl?.trim() ? false : true;
        const blurbValue =
            data.blurb != null && data.blurb.trim() !== ''
                ? sanitiseBlurb(data.blurb.trim())
                : null;

        const [row] = await db
            .insert(suggestions)
            .values({
                suggestionRoundId: data.suggestionRoundId,
                bookExternalId,
                suggesterKeyHash: data.suggesterKeyHash,
                title: data.title,
                author: data.author,
                coverUrl: data.coverUrl ?? null,
                coverUrlOverrideApproved,
                blurb: blurbValue,
                link: null,
                comment: commentValue,
                commenterName: commenterNameValue,
                manualPendingApproval: true,
            })
            .returning({
                id: suggestions.id,
                suggestionRoundId: suggestions.suggestionRoundId,
                bookExternalId: suggestions.bookExternalId,
                createdAt: suggestions.createdAt,
            });

        if (!row) {
            return NextResponse.json(
                { error: 'Failed to add suggestion' },
                { status: 500 },
            );
        }

        return NextResponse.json({ suggestion: row });
    } catch (err) {
        console.error('Manual entry error:', err);
        return NextResponse.json(
            { error: 'Failed to add manual entry' },
            { status: 500 },
        );
    }
}

export async function POST(request: Request) {
    const rateLimitRes = checkRateLimit(
        request,
        'suggestions-post',
        SUGGESTIONS_POST_RATE_LIMIT_PER_MINUTE,
    );
    if (rateLimitRes) return rateLimitRes;

    if (!db) {
        return NextResponse.json(
            { error: 'Database not configured' },
            { status: 503 },
        );
    }

    const raw = await request.json();
    const manualParsed = manualEntryBodySchema.safeParse(raw);
    if (manualParsed.success) {
        return handleManualEntry(manualParsed.data);
    }
    const parsed = postBodySchema.safeParse(raw);
    if (!parsed.success) {
        const first = parsed.error.errors[0];
        const message = first?.message ?? 'Invalid request';
        return NextResponse.json(
            { error: message, details: parsed.error.flatten() },
            { status: 400 },
        );
    }

    try {
        const count = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(suggestions)
            .where(
                and(
                    eq(
                        suggestions.suggestionRoundId,
                        parsed.data.suggestionRoundId,
                    ),
                    eq(
                        suggestions.suggesterKeyHash,
                        parsed.data.suggesterKeyHash,
                    ),
                ),
            );

        const current = count[0]?.count ?? 0;
        if (current >= MAX_SUGGESTIONS_PER_PERSON) {
            return NextResponse.json(
                {
                    error: `Maximum ${MAX_SUGGESTIONS_PER_PERSON} suggestions per person per round`,
                },
                { status: 400 },
            );
        }

        const [existingSameBook] = await db
            .select({ id: suggestions.id })
            .from(suggestions)
            .where(
                and(
                    eq(
                        suggestions.suggestionRoundId,
                        parsed.data.suggestionRoundId,
                    ),
                    eq(
                        suggestions.suggesterKeyHash,
                        parsed.data.suggesterKeyHash,
                    ),
                    eq(suggestions.bookExternalId, parsed.data.bookExternalId),
                ),
            )
            .limit(1);
        if (existingSameBook) {
            return NextResponse.json(
                { error: 'You have already suggested this book in this round' },
                { status: 400 },
            );
        }

        let commentValue: string | null = null;
        if (parsed.data.comment != null && parsed.data.comment !== '') {
            const plainForCount = parsed.data.comment
                .replace(/<[^>]*>/g, ' ')
                .replace(/\r\n|\r|\n/g, ' ')
                .trim();
            const charCount = plainForCount.length;
            if (charCount > MAX_COMMENT_CHARS) {
                return NextResponse.json(
                    {
                        error: `Comment must be ${MAX_COMMENT_CHARS} characters or fewer (you have ${charCount})`,
                    },
                    { status: 400 },
                );
            }
            commentValue = sanitiseSuggestionComment(parsed.data.comment);
            if (commentValue !== '') {
                commentValue = censorProfanity(commentValue);
                if (commentValue === '') commentValue = null;
            } else {
                commentValue = null;
            }
        }

        const rawName = parsed.data.commenterName;
        const commenterNameValue =
            rawName == null || rawName === ''
                ? null
                : rawName
                      .replace(/<[^>]*>/g, '')
                      .trim()
                      .slice(0, MAX_COMMENTER_NAME_LENGTH) || null;

        const coverUrlOverrideApproved =
            parsed.data.coverUrlIsOverride === true ? false : true;

        const [row] = await db
            .insert(suggestions)
            .values({
                suggestionRoundId: parsed.data.suggestionRoundId,
                bookExternalId: parsed.data.bookExternalId,
                suggesterKeyHash: parsed.data.suggesterKeyHash,
                title: parsed.data.title,
                author: parsed.data.author,
                coverUrl: parsed.data.coverUrl ?? null,
                coverUrlOverrideApproved,
                blurb: parsed.data.blurb ?? null,
                link: parsed.data.link ?? null,
                comment: commentValue,
                commenterName: commenterNameValue,
            })
            .returning({
                id: suggestions.id,
                suggestionRoundId: suggestions.suggestionRoundId,
                bookExternalId: suggestions.bookExternalId,
                createdAt: suggestions.createdAt,
            });

        if (!row) {
            return NextResponse.json(
                { error: 'Failed to add suggestion' },
                { status: 500 },
            );
        }

        return NextResponse.json({ suggestion: row });
    } catch (err) {
        console.error('Add suggestion error:', err);
        return NextResponse.json(
            { error: 'Failed to add suggestion' },
            { status: 500 },
        );
    }
}
