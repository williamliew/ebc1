import sanitizeHtml, { type IOptions } from 'sanitize-html';

/**
 * Allowed tags for suggestion comments (TipTap: bold, italic, underline only).
 * No links or script; safe for display when comments are toggled on.
 */
const COMMENT_OPTIONS: IOptions = {
    allowedTags: ['p', 'br', 'strong', 'em', 'b', 'i', 'u', 'span'],
    allowedAttributes: {},
};

/**
 * Sanitise suggestion comment HTML for safe display (XSS prevention).
 * Use for any comment HTML before rendering with dangerouslySetInnerHTML.
 */
export function sanitiseSuggestionComment(
    html: string | null | undefined,
): string {
    if (html == null || html === '') return '';
    return sanitizeHtml(html, COMMENT_OPTIONS);
}
