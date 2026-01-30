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

/** Max length for stored blurb; Google often appends review content after the main description. */
const BLURB_MAX_LENGTH = 800;

/**
 * Keep only the main book description and drop review-style content.
 * Google Books volumeInfo.description can include editorial/customer reviews;
 * we truncate and cut at common review boundaries so stored blurbs stay description-only.
 */
export function cleanBlurb(raw: string | null | undefined): string | null {
    if (raw == null || typeof raw !== 'string') return null;
    const trimmed = raw.trim();
    if (!trimmed) return null;

    const reviewMarkers = [
        /\n\s*review\s*[:\-]/i,
        /\n\s*editorial review/i,
        /\n\s*customer review/i,
        /\n\s*from the publisher\s*[:\-]/i,
        /\n\s*\*\*\*/,
        /\n\s*—\s*review/i,
    ];

    let cut = trimmed;
    for (const re of reviewMarkers) {
        const idx = cut.search(re);
        if (idx !== -1) {
            cut = cut.slice(0, idx).trim();
            break;
        }
    }

    if (cut.length <= BLURB_MAX_LENGTH) return cut;
    const truncated = cut.slice(0, BLURB_MAX_LENGTH);
    const lastSpace = truncated.lastIndexOf(' ');
    const end =
        lastSpace > BLURB_MAX_LENGTH * 0.8 ? lastSpace : BLURB_MAX_LENGTH;
    return truncated.slice(0, end).trim() + '…';
}

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
        blurb: cleanBlurb(vi.description),
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
