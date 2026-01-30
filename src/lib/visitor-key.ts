/**
 * Single localStorage key used site-wide for votes and suggestions.
 * If it exists, we reuse it; if not, we create once and store it.
 */
const VISITOR_ID_KEY = 'ebc_visitor_id';

/**
 * Get or create a stable visitor key hash. Used for:
 * - votes (voterKeyHash)
 * - suggestions (suggesterKeyHash)
 *
 * On first visit we generate a UUID, store it in localStorage, then return its
 * SHA-256 hash. On later visits we read the stored ID and return its hash.
 * No PII is stored; only an opaque ID and its hash are used.
 */
export async function getOrCreateVisitorKeyHash(): Promise<string> {
    if (typeof window === 'undefined') return '';

    let id = localStorage.getItem(VISITOR_ID_KEY);
    if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem(VISITOR_ID_KEY, id);
    }

    const buf = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(id),
    );
    return Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
}
