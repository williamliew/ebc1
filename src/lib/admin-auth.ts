/**
 * Light admin auth: signed cookie verified with ADMIN_PASSWORD.
 * Works in Edge (middleware) and Node (API routes) via Web Crypto.
 */

import { env } from '@/lib/env';

const COOKIE_NAME = 'admin_session';
const HMAC_MESSAGE = 'admin_session';

export { COOKIE_NAME };

async function hmacSha256Hex(password: string): Promise<string> {
    const key = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(password),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign'],
    );
    const sig = await crypto.subtle.sign(
        'HMAC',
        key,
        new TextEncoder().encode(HMAC_MESSAGE),
    );
    return Array.from(new Uint8Array(sig))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
}

export async function createAdminToken(password: string): Promise<string> {
    return hmacSha256Hex(password);
}

export async function verifyAdminToken(
    token: string,
    password: string,
): Promise<boolean> {
    if (!token || !password) return false;
    const expected = await hmacSha256Hex(password);
    return token === expected;
}

/** Use in API routes: returns 401 Response if admin auth is on and not authenticated. */
export async function requireAdmin(request: Request): Promise<Response | null> {
    const adminPassword = env.ADMIN_PASSWORD;
    if (!adminPassword) return null;

    const cookieHeader = request.headers.get('cookie');
    const match = cookieHeader?.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
    const token = match?.[1];
    if (!token || !(await verifyAdminToken(token, adminPassword))) {
        return new Response(
            JSON.stringify({ error: 'Admin authentication required' }),
            { status: 401, headers: { 'Content-Type': 'application/json' } },
        );
    }
    return null;
}
