import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { COOKIE_NAME, verifyAdminToken } from '@/lib/admin-auth';

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    if (!pathname.startsWith('/admin')) {
        return NextResponse.next();
    }

    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
        return NextResponse.next();
    }

    if (pathname === '/admin/login') {
        const token = request.cookies.get(COOKIE_NAME)?.value;
        if (token && (await verifyAdminToken(token, adminPassword))) {
            return NextResponse.redirect(new URL('/admin', request.url));
        }
        return NextResponse.next();
    }

    const token = request.cookies.get(COOKIE_NAME)?.value;
    if (!token || !(await verifyAdminToken(token, adminPassword))) {
        const login = new URL('/admin/login', request.url);
        login.searchParams.set('from', pathname);
        return NextResponse.redirect(login);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/admin', '/admin/:path*'],
};
