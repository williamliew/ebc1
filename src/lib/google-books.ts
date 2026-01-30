import { unstable_cache } from 'next/cache';
import { env } from '@/lib/env';

export type BookDetails = {
    externalId: string;
    title: string;
    author: string;
    coverUrl: string | null;
    blurb: string | null;
    link: string | null;
};

async function fetchBookFromGoogle(
    volumeId: string,
): Promise<BookDetails | null> {
    const apiKey = env.GOOGLE_BOOKS_API_KEY;
    if (!apiKey) return null;

    const url = `https://www.googleapis.com/books/v1/volumes/${encodeURIComponent(volumeId)}?key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const data = (await res.json()) as {
        id: string;
        volumeInfo?: {
            title?: string;
            authors?: string[];
            description?: string;
            imageLinks?: { thumbnail?: string; smallThumbnail?: string };
            infoLink?: string;
        };
    };

    const vi = data.volumeInfo ?? {};
    const authors = vi.authors ?? [];
    const cover =
        vi.imageLinks?.thumbnail ?? vi.imageLinks?.smallThumbnail ?? null;

    return {
        externalId: data.id,
        title: vi.title ?? 'Unknown title',
        author: authors.join(', ') || 'Unknown author',
        coverUrl: cover ?? null,
        blurb: vi.description ?? null,
        link: vi.infoLink ?? null,
    };
}

/**
 * Fetch book details by Google Books volume ID. Cached for 24 hours per ID
 * so we minimise API calls and keep the DB storing only IDs.
 */
export function getBookDetails(volumeId: string): Promise<BookDetails | null> {
    return unstable_cache(
        () => fetchBookFromGoogle(volumeId),
        [`book-${volumeId}`],
        { revalidate: 86400 },
    )();
}

export async function getBooksDetails(
    volumeIds: string[],
): Promise<BookDetails[]> {
    const results = await Promise.all(
        volumeIds.map((id) => getBookDetails(id)),
    );
    return results.filter((r): r is BookDetails => r !== null);
}
