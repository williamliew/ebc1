import Link from 'next/link';
import { BackArrowIcon } from '@/components/back-arrow-icon';
import { SignOutIcon } from '@/components/sign-out-icon';

export default function AdminPage() {
    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-foreground">
            <main className="max-w-md w-full text-center space-y-6">
                <h1 className="font-heading text-2xl font-semibold">Admin</h1>
                <div className="flex flex-col sm:flex-row flex-wrap gap-3 justify-center">
                    <Link
                        href="/admin/create-a-vote"
                        className="inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground px-5 py-2.5 text-sm font-medium hover:bg-[var(--primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 focus:ring-offset-[var(--background)]"
                    >
                        Create a vote
                    </Link>
                    <Link
                        href="/admin/open-suggestions"
                        className="inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground px-5 py-2.5 text-sm font-medium hover:bg-[var(--primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 focus:ring-offset-[var(--background)]"
                    >
                        Open book suggestions
                    </Link>
                    <Link
                        href="/admin/bookofthemonth"
                        className="inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground px-5 py-2.5 text-sm font-medium hover:bg-[var(--primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 focus:ring-offset-[var(--background)]"
                    >
                        Set book of the month
                    </Link>
                    <Link
                        href="/admin/book-of-the-month-graphic"
                        className="inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground px-5 py-2.5 text-sm font-medium hover:bg-[var(--primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 focus:ring-offset-[var(--background)]"
                    >
                        Book of the month graphic
                    </Link>
                    <Link
                        href="/admin/vote-results"
                        className="inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground px-5 py-2.5 text-sm font-medium hover:bg-[var(--primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 focus:ring-offset-[var(--background)]"
                    >
                        Vote results
                    </Link>
                    <Link
                        href="/admin/view-suggestions"
                        className="inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground px-5 py-2.5 text-sm font-medium hover:bg-[var(--primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 focus:ring-offset-[var(--background)]"
                    >
                        View suggestions
                    </Link>
                </div>
                <div className="flex flex-row flex-wrap items-center justify-center gap-6 py-2 text-sm text-muted">
                    <Link href="/" className="inline-flex items-center gap-1.5 underline hover:no-underline">
                        <BackArrowIcon className="size-4 shrink-0" />
                        Back to home
                    </Link>
                    <Link
                        href="/api/admin/logout"
                        className="inline-flex items-center gap-1.5 underline hover:no-underline"
                    >
                        Sign out
                        <SignOutIcon className="size-4 shrink-0" />
                    </Link>
                </div>
            </main>
        </div>
    );
}
