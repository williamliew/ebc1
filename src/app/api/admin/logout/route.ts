import { NextResponse } from 'next/server';
import { COOKIE_NAME } from '@/lib/admin-auth';

function clearCookie(res: NextResponse) {
    res.cookies.set(COOKIE_NAME, '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0,
        path: '/',
    });
}

export async function GET(request: Request) {
    const origin = new URL(request.url).origin;
    const res = NextResponse.redirect(new URL('/admin/login', origin));
    clearCookie(res);
    return res;
}

export async function POST() {
    const res = NextResponse.json({ ok: true });
    clearCookie(res);
    return res;
}
