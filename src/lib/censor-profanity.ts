/**
 * Profanity censoring for user-generated text (e.g. suggestion comments).
 * Uses obscenity to replace matched words with asterisks so comments are
 * allowed but displayed as safe-for-work.
 */

import {
    RegExpMatcher,
    TextCensor,
    englishDataset,
    englishRecommendedTransformers,
    asteriskCensorStrategy,
    keepStartCensorStrategy,
} from 'obscenity';

const matcher = new RegExpMatcher({
    ...englishDataset.build(),
    ...englishRecommendedTransformers,
});

// First letter visible, rest asterisks (e.g. "shit" → "s***")
const censor = new TextCensor().setStrategy(
    keepStartCensorStrategy(asteriskCensorStrategy()),
);

/**
 * Replaces profanity with first letter + asterisks (e.g. "shit" → "s***").
 * Safe to call on HTML: matches occur in text content; tags are left intact.
 * Returns the same string if no profanity is found.
 */
export function censorProfanity(text: string): string {
    if (typeof text !== 'string' || text.length === 0) return text;
    const matches = matcher.getAllMatches(text, true);
    if (matches.length === 0) return text;
    return censor.applyTo(text, matches);
}
