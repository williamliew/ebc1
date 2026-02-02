import { NextResponse } from 'next/server';
import { z } from 'zod';
import { checkRateLimit } from '@/lib/rate-limit';

const PAGE_SIZE = 10;
const SEARCH_RATE_LIMIT_PER_MINUTE = 60;

const bodySchema = z.object({
    title: z.string().max(200).optional(),
    author: z.string().max(200).optional(),
    page: z.number().int().min(1).optional().default(1),
});

export type BookSearchResult = {
    externalId: string;
    title: string;
    author: string;
    coverUrl: string | null;
    /** All cover image URLs for this work (for thumbnail selection in review). */
    coverOptions: string[];
    blurb: string | null;
    link: string | null;
};

const OPENLIBRARY_SEARCH = 'https://openlibrary.org/search.json';
const OPENLIBRARY_BASE = 'https://openlibrary.org';
const COVERS_BASE = 'https://covers.openlibrary.org/b/id';

type SearchDoc = {
    key: string;
    title?: string;
    author_name?: string[];
    cover_i?: number;
    cover_edition_key?: string;
};

type WorkJson = {
    key: string;
    title?: string;
    description?: { type?: string; value?: string };
    covers?: number[];
};

async function fetchWork(key: string): Promise<WorkJson | null> {
    const url = `${OPENLIBRARY_BASE}${key}.json`;
    try {
        const res = await fetch(url);
        if (!res.ok) return null;
        return (await res.json()) as WorkJson;
    } catch {
        return null;
    }
}

function coverUrlFromCoverId(coverId: number): string {
    return `${COVERS_BASE}/${coverId}-L.jpg`;
}

export async function POST(request: Request) {
    const rateLimitRes = checkRateLimit(
        request,
        'books-search',
        SEARCH_RATE_LIMIT_PER_MINUTE,
    );
    if (rateLimitRes) return rateLimitRes;

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
        return NextResponse.json(
            { error: 'Invalid request', details: parsed.error.flatten() },
            { status: 400 },
        );
    }

    const title = (parsed.data.title ?? '').trim();
    const author = (parsed.data.author ?? '').trim();
    if (!title && !author) {
        return NextResponse.json(
            { error: 'Provide at least a title or author' },
            { status: 400 },
        );
    }

    const params = new URLSearchParams();
    if (title) params.set('title', title);
    if (author) params.set('author', author);
    const page = parsed.data.page;
    const offset = (page - 1) * PAGE_SIZE;
    params.set('limit', String(PAGE_SIZE));
    params.set('offset', String(offset));

    const url = `${OPENLIBRARY_SEARCH}?${params.toString()}`;

    try {
        const res = await fetch(url);
        if (!res.ok) {
            const text = await res.text();
            console.error('Open Library search error:', res.status, text);
            return NextResponse.json(
                { error: 'Book search failed' },
                { status: 502 },
            );
        }

        const data = (await res.json()) as {
            numFound?: number;
            start?: number;
            docs?: SearchDoc[];
        };

        const totalItems = data.numFound ?? 0;
        const docs = data.docs ?? [];

        const results: BookSearchResult[] = await Promise.all(
            docs.slice(0, PAGE_SIZE).map(async (doc) => {
                const key = doc.key ?? '';
                const titleText = doc.title ?? 'Unknown title';
                const authorText =
                    Array.isArray(doc.author_name) && doc.author_name.length > 0
                        ? doc.author_name.join(', ')
                        : 'Unknown author';
                const link = key ? `${OPENLIBRARY_BASE}${key}` : null;

                const work = await fetchWork(key);
                const coverOptions: number[] = [];
                let coverUrl: string | null = null;
                let blurb: string | null = null;

                if (work) {
                    if (work.covers && work.covers.length > 0) {
                        for (const id of work.covers) {
                            coverOptions.push(id);
                        }
                        coverUrl = coverUrlFromCoverId(
                            work.covers[work.covers.length - 1],
                        );
                    }
                    if (typeof work.description?.value === 'string') {
                        blurb = work.description.value.trim() || null;
                    }
                }

                if (doc.cover_i != null) {
                    const docCoverId = doc.cover_i;
                    if (!coverOptions.includes(docCoverId)) {
                        coverOptions.unshift(docCoverId);
                    }
                    if (!coverUrl) {
                        coverUrl = coverUrlFromCoverId(docCoverId);
                    }
                }

                const coverOptionUrls = coverOptions.map(coverUrlFromCoverId);

                return {
                    externalId: key,
                    title: titleText,
                    author: authorText,
                    coverUrl,
                    coverOptions: coverOptionUrls,
                    blurb,
                    link,
                };
            }),
        );

        return NextResponse.json({
            results,
            totalItems,
            page,
            pageSize: PAGE_SIZE,
        });
    } catch (err) {
        console.error('Book search error:', err);
        return NextResponse.json(
            { error: 'Book search failed' },
            { status: 500 },
        );
    }
}
