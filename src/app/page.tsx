import { isAdminAuthenticated } from '@/lib/admin-auth-server';
import { EbcLogo } from '@/components/ebc-logo';
import { AdminPanel } from '@/components/admin-panel';
import { HomeStatus } from '@/components/home-status';
import { InstagramIcon } from '@/components/instagram-icon';

/** Force per-request render so admin visibility is never served from cache. */
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Home() {
    const showAdmin = await isAdminAuthenticated();

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-foreground">
            <AdminPanel showAdmin={showAdmin} />

            <main className="max-w-md w-full text-center space-y-6">
                <div className="overflow-hidden w-[300px] h-[300px] inline-block text-inherit">
                    <EbcLogo className="block w-full h-full origin-center fill-current scale-[1.5]" />
                </div>

                <h1 className="font-heading text-2xl font-semibold">
                    Welcome to Elwood Book Club!
                </h1>

                <div className="flex flex-col sm:flex-row flex-wrap gap-3 justify-center">
                    <p>Elwood Book Club is a social monthly book club.</p>

                    <p>For each meet-up we try out a new bar near Elwood.</p>

                    <p>
                        We are a pretty chilled bunch - our meet-ups are relaxed
                        catch ups where we chat about the book and also each
                        other.
                    </p>

                    <p>Our members choose our book each month.</p>

                    <p>
                        We&apos;re pretty keen on keeping it low-key, so if
                        you&apos;ve had a hectic week at work and not finished
                        the book..rock up anyway. No judgement or pressure here.
                        We&apos;ve all been there - some of us repeatedly!
                    </p>

                    <p>
                        Most people come alone, so if you need a sign to get out
                        there and meet some beautiful new people, this is it!
                    </p>
                </div>

                <HomeStatus />

                <a
                    href="https://www.instagram.com/elwoodbookclub/"
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Visit our Instagram page"
                    className="inline-flex items-center justify-center text-muted-foreground rounded-full p-2 transition-colors transition-transform hover:text-foreground hover:bg-[var(--surface-hover)] hover:scale-110 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2"
                    aria-label="Elwood Book Club on Instagram"
                >
                    <InstagramIcon className="w-6 h-6" />
                </a>
            </main>
        </div>
    );
}
