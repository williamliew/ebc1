import Link from 'next/link';

export default function AdminPage() {
    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-foreground">
            <main className="max-w-md w-full text-center space-y-6">
                <h1 className="text-2xl font-semibold">Admin</h1>
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
                </div>
                <p className="text-sm text-muted space-x-4">
                    <Link href="/" className="underline hover:no-underline">
                        ← Back to home
                    </Link>
                    <Link
                        href="/api/admin/logout"
                        className="underline hover:no-underline"
                    >
                        Sign out
                    </Link>
                </p>
            </main>
        </div>
    );
}
