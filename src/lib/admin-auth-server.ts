/**
 * Server-only admin auth helpers (use cookies from next/headers).
 * Do not import this from middleware — middleware imports admin-auth.ts only.
 */

import { cookies } from 'next/headers';
import { env } from '@/lib/env';
import { COOKIE_NAME, verifyAdminToken } from '@/lib/admin-auth';

/** For Server Components: true only when ADMIN_PASSWORD is set and the request has a valid admin cookie. */
export async function isAdminAuthenticated(): Promise<boolean> {
    const adminPassword = env.ADMIN_PASSWORD;
    if (!adminPassword) return false;
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return false;
    return verifyAdminToken(token, adminPassword);
}
