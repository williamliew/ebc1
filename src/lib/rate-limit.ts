/**
 * Best-effort in-memory rate limiter. Per-IP, per-key (e.g. endpoint name).
 * In serverless (Vercel), each instance has its own store; limits are best-effort
 * under high concurrency. For strict limits use an external store (e.g. Upstash).
 */

const store = new Map<string, { count: number; resetAt: number }>();

const WINDOW_MS = 60 * 1000; // 1 minute

function getKey(ip: string, endpoint: string): string {
    return `${ip}:${endpoint}`;
}

function prune(): void {
    const now = Date.now();
    for (const [key, value] of store.entries()) {
        if (value.resetAt <= now) store.delete(key);
    }
}

/**
 * Get client IP from request (Vercel: x-forwarded-for, x-real-ip).
 */
export function getClientIp(request: Request): string {
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
        const first = forwarded.split(',')[0]?.trim();
        if (first) return first;
    }
    const real = request.headers.get('x-real-ip');
    if (real) return real.trim();
    return 'unknown';
}

/**
 * Check rate limit. Returns null if under limit, or a 429 Response if over.
 * @param request - Request (for IP)
 * @param endpoint - Identifier for this endpoint (e.g. 'login', 'votes-post')
 * @param maxPerMinute - Max requests per minute per IP
 */
export function checkRateLimit(
    request: Request,
    endpoint: string,
    maxPerMinute: number,
): Response | null {
    const ip = getClientIp(request);
    const key = getKey(ip, endpoint);
    const now = Date.now();

    if (store.size > 10000) prune();

    let entry = store.get(key);
    if (!entry) {
        entry = { count: 1, resetAt: now + WINDOW_MS };
        store.set(key, entry);
        return null;
    }
    if (entry.resetAt <= now) {
        entry = { count: 1, resetAt: now + WINDOW_MS };
        store.set(key, entry);
        return null;
    }
    entry.count += 1;
    if (entry.count > maxPerMinute) {
        return new Response(JSON.stringify({ error: 'Too many requests' }), {
            status: 429,
            headers: {
                'Content-Type': 'application/json',
                'Retry-After': '60',
            },
        });
    }
    return null;
}
