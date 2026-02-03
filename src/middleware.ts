import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { COOKIE_NAME, verifyAdminToken } from '@/lib/admin-auth';

/** Add noindex/nofollow for non-home routes so crawlers do not index member-only pages. */
function withCrawlPrevention(
    res: NextResponse,
    pathname: string,
): NextResponse {
    if (pathname !== '/') {
        res.headers.set('X-Robots-Tag', 'noindex, nofollow');
    }
    return res;
}

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    if (!pathname.startsWith('/admin')) {
        return withCrawlPrevention(NextResponse.next(), pathname);
    }

    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
        return withCrawlPrevention(NextResponse.next(), pathname);
    }

    if (pathname === '/admin/login') {
        const token = request.cookies.get(COOKIE_NAME)?.value;
        if (token && (await verifyAdminToken(token, adminPassword))) {
            return withCrawlPrevention(
                NextResponse.redirect(new URL('/admin', request.url)),
                pathname,
            );
        }
        return withCrawlPrevention(NextResponse.next(), pathname);
    }

    const token = request.cookies.get(COOKIE_NAME)?.value;
    if (!token || !(await verifyAdminToken(token, adminPassword))) {
        const login = new URL('/admin/login', request.url);
        login.searchParams.set('from', pathname);
        return withCrawlPrevention(NextResponse.redirect(login), pathname);
    }

    return withCrawlPrevention(NextResponse.next(), pathname);
}

export const config = {
    matcher: [
        '/',
        '/admin',
        '/admin/:path*',
        '/vote',
        '/vote/:path*',
        '/nextbook',
        '/nextbook/:path*',
    ],
};
