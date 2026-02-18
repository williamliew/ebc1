import { NextResponse } from 'next/server';
import { z } from 'zod';
import { checkRateLimit } from '@/lib/rate-limit';
import type { BookSearchResult } from '@/app/api/books/search/route';

const PAGE_SIZE = 10;
const RATE_LIMIT_PER_MINUTE = 60;
const GOOGLE_BOOKS_BASE = 'https://www.googleapis.com/books/v1/volumes';

const bodySchema = z.object({
    title: z.string().max(200).optional(),
    author: z.string().max(200).optional(),
    page: z.number().int().min(1).optional().default(1),
});

type GoogleVolumeItem = {
    id: string;
    volumeInfo?: {
        title?: string;
        authors?: string[];
        description?: string;
        imageLinks?: {
            thumbnail?: string;
            small?: string;
            smallThumbnail?: string;
        };
        infoLink?: string;
    };
};

/** Force HTTPS to avoid mixed-content on HTTPS pages (Google Books often returns http). */
function toHttps(url: string | null | undefined): string | null {
    if (url == null || url === '') return null;
    const trimmed = url.trim();
    if (trimmed.startsWith('http://')) return 'https://' + trimmed.slice(7);
    return trimmed;
}

function toBookSearchResult(item: GoogleVolumeItem): BookSearchResult {
    const vi = item.volumeInfo ?? {};
    const title = vi.title?.trim() ?? 'Unknown title';
    const author =
        Array.isArray(vi.authors) && vi.authors.length > 0
            ? vi.authors.join(', ')
            : 'Unknown author';
    const imageLinks = vi.imageLinks;
    const rawCover =
        imageLinks?.thumbnail ??
        imageLinks?.small ??
        imageLinks?.smallThumbnail ??
        null;
    const coverUrl = toHttps(rawCover);
    const coverOptions = coverUrl ? [coverUrl] : [];
    const blurb =
        typeof vi.description === 'string' && vi.description.trim()
            ? vi.description.trim()
            : null;
    const link = vi.infoLink ?? null;

    return {
        externalId: item.id ?? `google-${title}-${author}`.replace(/\s+/g, '-'),
        title,
        author,
        coverUrl,
        coverOptions,
        blurb,
        link,
    };
}

export async function POST(request: Request) {
    const rateLimitRes = checkRateLimit(
        request,
        'books-search-google',
        RATE_LIMIT_PER_MINUTE,
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

    const qParts: string[] = [];
    if (title) qParts.push(`intitle:${title.replace(/"/g, '')}`);
    if (author) qParts.push(`inauthor:${author.replace(/"/g, '')}`);
    const q = qParts.join('+');
    const page = parsed.data.page;
    const startIndex = (page - 1) * PAGE_SIZE;

    const params = new URLSearchParams();
    params.set('q', q);
    params.set('maxResults', String(PAGE_SIZE));
    params.set('startIndex', String(startIndex));
    params.set('printType', 'books');
    const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
    if (apiKey) params.set('key', apiKey);

    const url = `${GOOGLE_BOOKS_BASE}?${params.toString()}`;

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!res.ok) {
            const text = await res.text();
            console.error(
                'Google Books search error:',
                res.status,
                url.replace(/key=[^&]+/, 'key=…'),
                text.slice(0, 200),
            );
            if (res.status === 429) {
                return NextResponse.json(
                    {
                        error:
                            'Google Books daily limit reached. Try again tomorrow or use Open Library results.',
                    },
                    { status: 502 },
                );
            }
            return NextResponse.json(
                { error: 'Google Books search failed' },
                { status: 502 },
            );
        }

        const data = (await res.json()) as {
            totalItems?: number;
            items?: GoogleVolumeItem[];
        };
        const totalItems = data.totalItems ?? 0;
        const items = data.items ?? [];
        const results: BookSearchResult[] = items.map(toBookSearchResult);

        return NextResponse.json({
            results,
            totalItems,
            page,
            pageSize: PAGE_SIZE,
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const isAbort = err instanceof Error && err.name === 'AbortError';
        console.error('Google Books search error:', message, err);
        return NextResponse.json(
            {
                error: isAbort
                    ? 'Search timed out. Please try again.'
                    : 'Google Books search failed',
            },
            { status: 500 },
        );
    }
}
