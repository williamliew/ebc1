import { NextResponse } from 'next/server';
import { z } from 'zod';
import { env } from '@/lib/env';
import { createAdminToken, COOKIE_NAME } from '@/lib/admin-auth';
import { checkRateLimit } from '@/lib/rate-limit';

const bodySchema = z.object({
    password: z.string(),
});

const LOGIN_RATE_LIMIT_PER_MINUTE = 10;

export async function POST(request: Request) {
    const rateLimitRes = checkRateLimit(
        request,
        'admin-login',
        LOGIN_RATE_LIMIT_PER_MINUTE,
    );
    if (rateLimitRes) return rateLimitRes;

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const adminPassword = env.ADMIN_PASSWORD;
    if (!adminPassword) {
        return NextResponse.json(
            { error: 'Admin auth not configured' },
            { status: 503 },
        );
    }

    if (parsed.data.password !== adminPassword) {
        return NextResponse.json(
            { error: 'Invalid password' },
            { status: 401 },
        );
    }

    const token = await createAdminToken(adminPassword);
    const isProduction = process.env.NODE_ENV === 'production';
    const res = NextResponse.json({ ok: true });
    res.cookies.set(COOKIE_NAME, token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
    });
    return res;
}
