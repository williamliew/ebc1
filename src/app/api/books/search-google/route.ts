import { NextResponse } from 'next/server';
import { z } from 'zod';
import { checkRateLimit } from '@/lib/rate-limit';
import type { BookSearchResult } from '@/app/api/books/search/route';

const PAGE_SIZE = 10;
/** Request extra items so that after deduplication we can still return PAGE_SIZE. */
const REQUEST_PAGE_SIZE = 40;
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
        categories?: string[];
        language?: string;
        imageLinks?: {
            thumbnail?: string;
            small?: string;
            smallThumbnail?: string;
        };
        infoLink?: string;
    };
};

/** True if the volume is considered English (langRestrict is also set on the API request). */
function isEnglishVolume(item: GoogleVolumeItem): boolean {
    const lang = item.volumeInfo?.language?.toLowerCase();
    if (!lang) return true;
    return lang === 'en' || lang.startsWith('en-');
}

/** True if the volume's categories look fiction-related (for "fiction first" sorting). */
function isFictionCategory(item: GoogleVolumeItem): boolean {
    const categories = item.volumeInfo?.categories;
    if (!Array.isArray(categories) || categories.length === 0) return false;
    const joined = categories.join(' ').toLowerCase();
    return (
        /\bfiction\b/.test(joined) ||
        /\bnovel\b/.test(joined) ||
        /\bromance\b/.test(joined) ||
        /\bliterary\b/.test(joined) ||
        /\bgeneral\b/.test(joined)
    );
}

/** Force HTTPS to avoid mixed-content on HTTPS pages (Google Books often returns http). */
function toHttps(url: string | null | undefined): string | null {
    if (url == null || url === '') return null;
    const trimmed = url.trim();
    if (trimmed.startsWith('http://')) return 'https://' + trimmed.slice(7);
    return trimmed;
}

/** Normalise for deduplication: same book in different editions should get the same key. */
function normaliseKey(title: string, author: string): string {
    const t = title
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, '')
        .replace(/\s+/g, ' ')
        .trim();
    const a = author
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, '')
        .replace(/\s+/g, ' ')
        .trim();
    return `${t}|${a}`;
}

function getDescriptionLength(item: GoogleVolumeItem): number {
    const d = item.volumeInfo?.description;
    if (typeof d !== 'string' || !d.trim()) return 0;
    return d.trim().length;
}

/**
 * Deduplicate by title+author and merge editions into one result.
 * - Blurb: use the longest description in the group (best chance of a full, correct blurb).
 * - Cover: prefer a volume that has a cover; merge all cover URLs into coverOptions.
 * - Link: first non-null infoLink in the group.
 */
function dedupeAndMerge(items: GoogleVolumeItem[]): BookSearchResult[] {
    const byKey = new Map<string, GoogleVolumeItem[]>();
    for (const item of items) {
        const vi = item.volumeInfo ?? {};
        const title = vi.title?.trim() ?? 'Unknown title';
        const author =
            Array.isArray(vi.authors) && vi.authors.length > 0
                ? vi.authors.join(', ')
                : 'Unknown author';
        const key = normaliseKey(title, author);
        const list = byKey.get(key) ?? [];
        list.push(item);
        byKey.set(key, list);
    }

    const results: BookSearchResult[] = [];
    for (const group of byKey.values()) {
        const first = group[0];
        const vi = first.volumeInfo ?? {};
        const title = vi.title?.trim() ?? 'Unknown title';
        const author =
            Array.isArray(vi.authors) && vi.authors.length > 0
                ? vi.authors.join(', ')
                : 'Unknown author';

        const bestForBlurb = group.reduce((best, cur) =>
            getDescriptionLength(cur) > getDescriptionLength(best) ? cur : best,
        );
        const blurb =
            typeof bestForBlurb.volumeInfo?.description === 'string' &&
            bestForBlurb.volumeInfo.description.trim()
                ? bestForBlurb.volumeInfo.description.trim()
                : null;

        const coverOptions: string[] = [];
        let coverUrl: string | null = null;
        for (const item of group) {
            const imageLinks = item.volumeInfo?.imageLinks;
            const raw =
                imageLinks?.thumbnail ??
                imageLinks?.small ??
                imageLinks?.smallThumbnail ??
                null;
            const url = toHttps(raw);
            if (url && !coverOptions.includes(url)) {
                coverOptions.push(url);
                if (!coverUrl) coverUrl = url;
            }
        }

        const link =
            group.map((i) => i.volumeInfo?.infoLink).find(Boolean) ?? null;

        results.push({
            externalId:
                first.id ??
                `google-${title}-${author}`.replace(/\s+/g, '-'),
            title,
            author,
            coverUrl,
            coverOptions,
            blurb,
            link,
        });
    }
    return results;
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
    const startIndex = (page - 1) * REQUEST_PAGE_SIZE;

    const params = new URLSearchParams();
    params.set('q', q);
    params.set('maxResults', String(REQUEST_PAGE_SIZE));
    params.set('startIndex', String(startIndex));
    params.set('printType', 'books');
    params.set('langRestrict', 'en');
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
        const items = (data.items ?? []).filter(isEnglishVolume);
        // Fiction first for book club: sort so fiction-related categories appear at top
        const sorted = [...items].sort((a, b) => {
            const aFiction = isFictionCategory(a);
            const bFiction = isFictionCategory(b);
            if (aFiction && !bFiction) return -1;
            if (!aFiction && bFiction) return 1;
            return 0;
        });
        const merged = dedupeAndMerge(sorted);
        const results = merged.slice(0, PAGE_SIZE);

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
