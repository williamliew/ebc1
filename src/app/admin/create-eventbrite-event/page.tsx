'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { EventbriteForm } from '@/components/eventbrite-form';

export default function CreateEventbriteEventPage() {
    const { data, isLoading } = useQuery({
        queryKey: ['admin', 'book-of-the-month'],
        queryFn: async () => {
            const res = await fetch('/api/admin/book-of-the-month', {
                credentials: 'include',
            });
            if (!res.ok) return { book: null, meetingDate: null };
            return res.json() as Promise<{
                book: {
                    externalId: string;
                    title: string;
                    author: string;
                    coverUrl: string | null;
                    blurb: string | null;
                    link: string | null;
                } | null;
                meetingDate: string | null;
            }>;
        },
    });

    const book = data?.book ?? null;
    const meetingDate = data?.meetingDate ?? null;

    return (
        <div className="min-h-screen bg-background text-foreground">
            <header className="border-b border-border bg-surface px-4 py-4">
                <Link
                    href="/"
                    className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground mb-2"
                >
                    ← Back to home
                </Link>
                <h1 className="text-xl font-semibold">
                    Create event on Eventbrite
                </h1>
            </header>

            <main className="max-w-lg mx-auto p-6">
                {isLoading ? (
                    <p className="text-sm text-muted">Loading…</p>
                ) : !book ? (
                    <div className="rounded-lg border border-border bg-surface p-4 text-center space-y-4">
                        <p className="text-foreground">
                            No book of the month set yet.
                        </p>
                        <p className="text-sm text-muted">
                            Set the book first, then you can create the
                            Eventbrite event with the correct date and book
                            details.
                        </p>
                        <Link
                            href="/admin/bookofthemonth"
                            className="inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium hover:bg-[var(--primary-hover)]"
                        >
                            Set book of the month
                        </Link>
                    </div>
                ) : (
                    <EventbriteForm
                        bookTitle={book.title}
                        bookAuthor={book.author}
                        meetingDate={meetingDate}
                        showBackButton={false}
                    />
                )}
            </main>
        </div>
    );
}
