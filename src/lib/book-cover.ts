const LONGITOOD_BASE = 'https://bookcover.longitood.com/bookcover';

/**
 * Fetch a better-quality book cover from Longitood (Goodreads-style).
 * Returns the image URL on success, or null if not found or on error.
 * Use as fallback replacement for poor Google Books thumbnails.
 */
export async function getBookCoverUrl(
    title: string,
    author: string,
): Promise<string | null> {
    const params = new URLSearchParams();
    params.set('book_title', title.trim());
    params.set('author_name', author.trim());

    const url = `${LONGITOOD_BASE}?${params.toString()}`;
    try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const data = (await res.json()) as { url?: string; error?: string };
        if (data.error != null || typeof data.url !== 'string') return null;
        return data.url;
    } catch {
        return null;
    }
}
