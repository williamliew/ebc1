import type { Metadata } from 'next';
import { AdminIdleOverlay } from '@/components/admin-idle-overlay';

export const metadata: Metadata = {
    robots: { index: false, follow: false },
};

export default function AdminLayout({
    children,
}: Readonly<{ children: React.ReactNode }>) {
    return <AdminIdleOverlay>{children}</AdminIdleOverlay>;
}
