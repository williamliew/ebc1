import { NextResponse } from 'next/server';
import { z } from 'zod';
import { env } from '@/lib/env';
import { cleanBlurb } from '@/lib/google-books';

const PAGE_SIZE = 10;

const bodySchema = z.object({
    query: z.string().min(1).max(200),
    page: z.number().int().min(1).optional().default(1),
});

export type BookSearchResult = {
    externalId: string;
    title: string;
    author: string;
    coverUrl: string | null;
    blurb: string | null;
    link: string | null;
};

export async function POST(request: Request) {
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
        return NextResponse.json(
            { error: 'Invalid request', details: parsed.error.flatten() },
            { status: 400 },
        );
    }

    const apiKey = env.GOOGLE_BOOKS_API_KEY;
    if (!apiKey) {
        return NextResponse.json(
            { error: 'Google Books API key not configured' },
            { status: 503 },
        );
    }

    const q = encodeURIComponent(parsed.data.query);
    const page = parsed.data.page;
    const startIndex = (page - 1) * PAGE_SIZE;
    const url = `https://www.googleapis.com/books/v1/volumes?q=${q}&key=${apiKey}&maxResults=${PAGE_SIZE}&startIndex=${startIndex}`;

    try {
        const res = await fetch(url);
        if (!res.ok) {
            const text = await res.text();
            console.error('Google Books API error:', res.status, text);
            return NextResponse.json(
                { error: 'Book search failed' },
                { status: 502 },
            );
        }
        const data = (await res.json()) as {
            totalItems?: number;
            items?: Array<{
                id: string;
                volumeInfo?: {
                    title?: string;
                    authors?: string[];
                    description?: string;
                    imageLinks?: {
                        thumbnail?: string;
                        smallThumbnail?: string;
                    };
                    infoLink?: string;
                    industryIdentifiers?: Array<{
                        type?: string;
                        identifier?: string;
                    }>;
                };
            }>;
        };

        const totalItems = data.totalItems ?? 0;
        const rawItems = data.items ?? [];

        const hasIsbn13 = (item: (typeof rawItems)[0]) =>
            item.volumeInfo?.industryIdentifiers?.some(
                (id) => id.type === 'ISBN_13',
            ) ?? false;

        const items = [...rawItems].sort((a, b) => {
            const aHas = hasIsbn13(a) ? 1 : 0;
            const bHas = hasIsbn13(b) ? 1 : 0;
            return bHas - aHas;
        });

        const mapped: BookSearchResult[] = items
            .slice(0, PAGE_SIZE)
            .map((item) => {
                const vi = item.volumeInfo ?? {};
                const authors = vi.authors ?? [];
                const cover =
                    vi.imageLinks?.thumbnail ??
                    vi.imageLinks?.smallThumbnail ??
                    null;
                return {
                    externalId: item.id,
                    title: vi.title ?? 'Unknown title',
                    author: authors.join(', ') || 'Unknown author',
                    coverUrl: cover ?? null,
                    blurb: cleanBlurb(vi.description),
                    link: vi.infoLink ?? null,
                };
            });

        // Deduplicate by same title + author (normalised)
        const seen = new Set<string>();
        const results: BookSearchResult[] = [];
        for (const book of mapped) {
            const key = `${book.title.trim().toLowerCase()}|${book.author.trim().toLowerCase()}`;
            if (seen.has(key)) continue;
            seen.add(key);
            results.push(book);
        }

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
