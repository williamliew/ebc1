/**
 * Safe-for-work blocklist for suggestion comments.
 * Comments containing any of these words (case-insensitive) are rejected server-side.
 * Extend this list as needed; avoid logging or exposing blocklist contents.
 */
const BLOCKLIST = new Set(
    [
        // Profanity and slurs (representative list; extend for your community)
        'fuck',
        'fucking',
        'shit',
        'damn',
        'ass',
        'bitch',
        'bastard',
        'crap',
        'dick',
        'cock',
        'pussy',
        'cunt',
        'whore',
        'slut',
        'nigger',
        'nigga',
        'fag',
        'faggot',
        'retard',
        'retarded',
        'rape',
        'raping',
        'pedophile',
        'pedo',
    ].map((w) => w.toLowerCase()),
);

function escapeRegex(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Returns true if the plain text contains any blocklisted word (safe-for-work check).
 * Uses whole-word matching so e.g. "class" is not flagged for "ass".
 * Pass stripHtml first if content is HTML (e.g. from TipTap).
 */
export function containsBlocklistedWord(plainText: string): boolean {
    const lower = plainText.toLowerCase();
    for (const blocked of BLOCKLIST) {
        const re = new RegExp(`\\b${escapeRegex(blocked)}\\b`, 'i');
        if (re.test(lower)) return true;
    }
    return false;
}

/**
 * Strip HTML tags to get plain text for word count and blocklist check.
 */
export function stripHtmlForCheck(html: string): string {
    return html
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}
