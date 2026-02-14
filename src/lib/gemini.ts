/**
 * Server-only Gemini API helpers for book blurb and cover lookup.
 * Uses GEMINI_API_KEY or GOOGLE_API_KEY from env. Never expose the key to the client.
 */

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';
/** Must match a model in your AI Studio rate limit tab (e.g. Gemini 2.5 Flash). */
const MODEL = 'gemini-2.5-flash';

function getApiKey(): string | null {
    return process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY ?? null;
}

export function hasGeminiApiKey(): boolean {
    const key = getApiKey();
    return !!key?.trim();
}

type GenerateContentResult =
    | { text: string }
    | { error: 'no_key' | 'api_error'; status?: number; message?: string };

async function generateContent(
    prompt: string,
): Promise<GenerateContentResult> {
    const apiKey = getApiKey();
    if (!apiKey?.trim()) {
        return { error: 'no_key' };
    }

    const url = `${GEMINI_BASE}/models/${MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: {
                    maxOutputTokens: 2048,
                    temperature: 0.3,
                },
            }),
        });
        const data = (await res.json().catch(() => ({}))) as {
            error?: { message?: string };
            candidates?: Array<{
                content?: { parts?: Array<{ text?: string }> };
            }>;
        };
        if (!res.ok) {
            console.error(
                '[gemini] API error:',
                res.status,
                data.error?.message ?? res.statusText,
            );
            return {
                error: 'api_error',
                status: res.status,
                message: data.error?.message ?? res.statusText,
            };
        }
        const text =
            data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
        if (!text) {
            console.error(
                '[gemini] Empty or unexpected response. Keys:',
                Object.keys(data),
                'candidates?.[0]?.content:',
                data.candidates?.[0]?.content ? 'present' : 'missing',
            );
            return { error: 'api_error', message: 'Empty response' };
        }
        return { text };
    } catch (err) {
        console.error('[gemini] Request failed:', err);
        return {
            error: 'api_error',
            message: err instanceof Error ? err.message : String(err),
        };
    }
}

const BLURB_PROMPT = `For the book "{title}" by {author}:
If you have the publisher or back-cover description (or something very close to it), provide it exactly. Otherwise give a concise 2–4 sentence neutral plot summary with no spoilers.
Keep to a normal back-cover length (under 200 words). If you're not sure about the book, reply with only: NONE
Reply with nothing else except the blurb text or NONE.`;

/**
 * Get a blurb for the book: prefer real publisher/back-cover text, otherwise generate a short summary.
 * Returns null if the API key is missing or the model returns nothing usable.
 */
export async function getBlurbFromGemini(
    title: string,
    author: string,
): Promise<{ blurb: string; source: 'found' | 'generated' } | null> {
    const prompt = BLURB_PROMPT.replace('{title}', title).replace(
        '{author}',
        author,
    );
    const result = await generateContent(prompt);
    if ('error' in result) return null;
    if (!result.text || result.text.toUpperCase() === 'NONE') return null;
    const blurb = result.text.trim();
    if (blurb.length === 0) return null;
    // Heuristic: if short and no period mid-string, treat as generated summary
    const source: 'found' | 'generated' =
        blurb.length < 200 && !blurb.slice(0, -1).includes('.')
            ? 'generated'
            : 'found';
    return { blurb, source };
}

const COVER_PROMPT = `For the book "{title}" by {author}, give the exact title and author as used on the most well-known English-language edition (e.g. the original or most popular edition).
Reply with exactly two lines, no other text:
Title: [exact title]
Author: [exact author name]`;

/**
 * Get canonical title/author for the most well-known English edition (for cover lookup).
 * Returns null if the API key is missing or the response cannot be parsed.
 */
export async function getCanonicalBookForCover(
    title: string,
    author: string,
): Promise<{ title: string; author: string } | null> {
    const prompt = COVER_PROMPT.replace('{title}', title).replace(
        '{author}',
        author,
    );
    const result = await generateContent(prompt);
    if ('error' in result || !result.text) return null;
    const titleMatch = result.text.match(/Title:\s*(.+?)(?:\n|$)/i);
    const authorMatch = result.text.match(/Author:\s*(.+?)(?:\n|$)/i);
    const t = titleMatch?.[1]?.trim();
    const a = authorMatch?.[1]?.trim();
    if (!t || !a) return null;
    return { title: t, author: a };
}
