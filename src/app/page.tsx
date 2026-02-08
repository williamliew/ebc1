import { isAdminAuthenticated } from '@/lib/admin-auth-server';
import { EbcLogo } from '@/components/ebc-logo';
import { AdminPanel } from '@/components/admin-panel';
import { HomeStatus } from '@/components/home-status';

export default async function Home() {
    const showAdmin = await isAdminAuthenticated();
    const isLocal = process.env.NODE_ENV === 'development';

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-foreground">
            <AdminPanel showAdmin={showAdmin} isLocal={isLocal} />

            <main className="max-w-md w-full text-center space-y-6">
                <div className="overflow-hidden w-[300px] h-[300px] inline-block text-inherit">
                    <EbcLogo className="block w-full h-full origin-center fill-current scale-[1.5]" />
                </div>

                <h1 className="text-2xl font-semibold">
                    Welcome to Elwood Book Club!
                </h1>

                <div className="flex flex-col sm:flex-row flex-wrap gap-3 justify-center">
                    <p>Elwood Book Club is a social monthly book club.</p>

                    <p>
                        For each meet-up we try out a new bar near Elwood. This
                        month we are meeting at Republica in St Kilda.
                    </p>

                    <p>
                        We are a pretty chilled bunch - our meet-ups are relaxed
                        catch ups where we chat about the book and also each
                        other.
                    </p>

                    <p>
                        Our members choose our book each month. This month we
                        are reading &apos;Heart the Lover&apos;.
                    </p>

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
            </main>
        </div>
    );
}
