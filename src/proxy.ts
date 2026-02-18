import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';

/**
 * Protect /admin routes (except /admin/login): redirect to login when
 * ADMIN_PASSWORD is set and the request has no valid admin cookie.
 */
export async function proxy(request: NextRequest) {
    const pathname = request.nextUrl.pathname;

    if (!pathname.startsWith('/admin')) {
        return NextResponse.next();
    }
    if (pathname.startsWith('/admin/login')) {
        return NextResponse.next();
    }

    const authError = await requireAdmin(request);
    if (authError) {
        const loginUrl = new URL('/admin/login', request.url);
        loginUrl.searchParams.set('from', pathname);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/admin', '/admin/((?!login).*)'],
};
