/**
 * Vote access gate: per-round password. When set, /vote requires the password
 * to view the round; we store a signed cookie so we don't send the password.
 */

const COOKIE_NAME = 'vote_access';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function getSecret(): string {
    return (
        process.env.ADMIN_PASSWORD ??
        process.env.VOTE_ACCESS_SECRET ??
        'vote-access-secret'
    );
}

async function signRoundId(roundId: number): Promise<string> {
    const secret = getSecret();
    const key = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign'],
    );
    const sig = await crypto.subtle.sign(
        'HMAC',
        key,
        new TextEncoder().encode(`vote_round_${roundId}`),
    );
    const hex = Array.from(new Uint8Array(sig))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    return `${roundId}:${hex}`;
}

export async function createVoteAccessCookie(roundId: number): Promise<string> {
    const value = await signRoundId(roundId);
    return `${COOKIE_NAME}=${encodeURIComponent(value)}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax; HttpOnly`;
}

export async function verifyVoteAccessCookie(
    roundId: number,
    cookieHeader: string | null,
): Promise<boolean> {
    if (!cookieHeader) return false;
    const match = cookieHeader
        .split(';')
        .map((c) => c.trim())
        .find((c) => c.startsWith(`${COOKIE_NAME}=`));
    if (!match) return false;
    const value = decodeURIComponent(
        match.slice(COOKIE_NAME.length + 1).trim(),
    );
    const [idStr, sig] = value.split(':');
    if (!idStr || !sig || parseInt(idStr, 10) !== roundId) return false;
    const expected = await signRoundId(roundId);
    return value === expected;
}

export { COOKIE_NAME };
