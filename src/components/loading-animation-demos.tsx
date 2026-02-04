/**
 * Loading animation (book page flip) for the homepage.
 */

import { LoadingBookFlip } from '@/components/loading-book-flip';

export function LoadingAnimationDemos() {
    return (
        <section
            className="mt-12 pt-8 border-t border-border w-full max-w-md"
            aria-label="Loading animation"
        >
            <h2 className="text-lg font-semibold text-foreground mb-6">
                Loading animation
            </h2>
            <LoadingBookFlip className="rounded-xl border border-border bg-surface p-4" />
        </section>
    );
}
