import sanitizeHtml, { type IOptions } from 'sanitize-html';

/**
 * Allowed tags and attributes for book blurbs (e.g. from Open Library).
 * Keeps formatting (paragraphs, italics, links) and strips script/dangerous content.
 */
const BLURB_OPTIONS: IOptions = {
    allowedTags: [
        'p',
        'br',
        'i',
        'em',
        'strong',
        'b',
        'span',
        'a',
        'ul',
        'ol',
        'li',
    ],
    allowedAttributes: {
        a: ['href'],
        span: ['class'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
};

/**
 * Safely parse and sanitise HTML for display in a blurb.
 * Returns sanitised HTML string suitable for dangerouslySetInnerHTML.
 */
export function sanitiseBlurb(html: string | null | undefined): string {
    if (html == null || html === '') return '';
    return sanitizeHtml(html, BLURB_OPTIONS);
}
