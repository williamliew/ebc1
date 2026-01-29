import { NextResponse } from 'next/server';
import { z } from 'zod';
import { env } from '@/lib/env';

const bodySchema = z.object({
    query: z.string().min(1).max(200),
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
    const url = `https://www.googleapis.com/books/v1/volumes?q=${q}&key=${apiKey}&maxResults=10`;

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
                };
            }>;
        };

        const items = data.items ?? [];
        const mapped: BookSearchResult[] = items.slice(0, 10).map((item) => {
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
                blurb: vi.description ?? null,
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

        return NextResponse.json({ results });
    } catch (err) {
        console.error('Book search error:', err);
        return NextResponse.json(
            { error: 'Book search failed' },
            { status: 500 },
        );
    }
}
