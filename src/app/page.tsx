import Link from 'next/link';
import { isAdminAuthenticated } from '@/lib/admin-auth-server';
import { EbcLogo } from '@/components/ebc-logo';

export default async function Home() {
    const showAdmin = await isAdminAuthenticated();
    const isLocal = process.env.NODE_ENV === 'development';

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-6 text-zinc-900 dark:text-zinc-100">
            <main className="max-w-md w-full text-center space-y-6">
                <div className="overflow-hidden w-[300px] h-[300px] inline-block text-inherit">
                    <EbcLogo className="block w-full h-full origin-center fill-current scale-[1.5]" />
                </div>

                {(showAdmin || isLocal) && (
                    <>
                        <p className="text-zinc-600 dark:text-zinc-400">
                            Admin pages
                        </p>
                        <div className="flex flex-col sm:flex-row flex-wrap gap-3 justify-center">
                            <Link
                                href="/admin/voting-builder"
                                className="inline-flex items-center justify-center rounded-lg bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900 px-5 py-2.5 text-sm font-medium hover:bg-zinc-700 dark:hover:bg-zinc-300"
                            >
                                Voting page builder
                            </Link>
                            <Link
                                href="/admin/question-builder"
                                className="inline-flex items-center justify-center rounded-lg bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900 px-5 py-2.5 text-sm font-medium hover:bg-zinc-700 dark:hover:bg-zinc-300"
                            >
                                Question builder
                            </Link>
                        </div>
                    </>
                )}

                <h1 className="text-2xl font-semibold">
                    Welcome to Elwood Book Club!
                </h1>

                {(showAdmin || isLocal) && (
                    <p className="text-zinc-600 dark:text-zinc-400">
                        Member / Public pages
                    </p>
                )}

                <div className="flex flex-col sm:flex-row flex-wrap gap-3 justify-center">
                    <Link
                        href="/vote"
                        className="inline-flex items-center justify-center rounded-lg bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900 px-5 py-2.5 text-sm font-medium hover:bg-zinc-700 dark:hover:bg-zinc-300"
                    >
                        Vote
                    </Link>
                    <Link
                        href="/nextbook"
                        className="inline-flex items-center justify-center rounded-lg bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900 px-5 py-2.5 text-sm font-medium hover:bg-zinc-700 dark:hover:bg-zinc-300"
                    >
                        Next book
                    </Link>
                </div>
            </main>
        </div>
    );
}
