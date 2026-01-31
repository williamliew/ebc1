/**
 * Open Library API helpers: search, work details, and book details for nomination.
 * @see https://openlibrary.org/dev/docs/api/search
 * @see https://openlibrary.org/works/OL19922194W.json
 */

export type BookDetails = {
    externalId: string;
    title: string;
    author: string;
    coverUrl: string | null;
    blurb: string | null;
    link: string | null;
};

const OPENLIBRARY_BASE = 'https://openlibrary.org';
const COVERS_BASE = 'https://covers.openlibrary.org/b/id';

type WorkJson = {
    key: string;
    title?: string;
    description?: { type?: string; value?: string };
    covers?: number[];
    authors?: Array<{ author?: { key?: string } }>;
};

type AuthorJson = {
    name?: string;
};

/**
 * Fetch work JSON by key (e.g. "/works/OL19922194W").
 */
async function fetchWork(key: string): Promise<WorkJson | null> {
    const url = `${OPENLIBRARY_BASE}${key.startsWith('/') ? key : `/${key}`}.json`;
    try {
        const res = await fetch(url);
        if (!res.ok) return null;
        return (await res.json()) as WorkJson;
    } catch {
        return null;
    }
}

/**
 * Fetch author name by key (e.g. "/authors/OL7290222A").
 */
async function fetchAuthorName(authorKey: string): Promise<string | null> {
    const path = authorKey.startsWith('/') ? authorKey : `/${authorKey}`;
    const url = `${OPENLIBRARY_BASE}${path}.json`;
    try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const data = (await res.json()) as AuthorJson;
        return data.name ?? null;
    } catch {
        return null;
    }
}

/**
 * Build cover URL from Open Library cover ID (last in covers array).
 */
function coverUrlFromCovers(covers: number[] | undefined): string | null {
    if (!covers || covers.length === 0) return null;
    const id = covers[covers.length - 1];
    return `${COVERS_BASE}/${id}-L.jpg`;
}

/**
 * Fetch book details for a single work key. Used when creating a nomination round.
 */
export async function getOpenLibraryBookDetails(
    workKey: string,
): Promise<BookDetails | null> {
    const key = workKey.startsWith('/') ? workKey : `/works/${workKey}`;
    const work = await fetchWork(key);
    if (!work) return null;

    const title = work.title ?? 'Unknown title';
    const blurb =
        typeof work.description?.value === 'string'
            ? work.description.value.trim()
            : null;
    const coverUrl = coverUrlFromCovers(work.covers);
    const link = `${OPENLIBRARY_BASE}${key}`;

    let author = 'Unknown author';
    const firstAuthorKey = work.authors?.[0]?.author?.key;
    if (firstAuthorKey) {
        const name = await fetchAuthorName(firstAuthorKey);
        if (name) author = name;
    }

    return {
        externalId: key,
        title,
        author,
        coverUrl,
        blurb,
        link,
    };
}

/**
 * Fetch book details for multiple Open Library work keys (e.g. when creating a round).
 */
export async function getOpenLibraryBooksDetails(
    workKeys: string[],
): Promise<BookDetails[]> {
    const results = await Promise.all(
        workKeys.map((key) => getOpenLibraryBookDetails(key)),
    );
    return results.filter((r): r is BookDetails => r !== null);
}
