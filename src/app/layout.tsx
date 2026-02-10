import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const geistSans = Geist({
    variable: '--font-geist-sans',
    subsets: ['latin'],
});

const geistMono = Geist_Mono({
    variable: '--font-geist-mono',
    subsets: ['latin'],
});

export const metadata: Metadata = {
    title: 'Elwood Book Club',
    icons: {
        icon: '/favicon.ico',
        apple: '/favicon.ico',
    },
    manifest: '/manifest.json',
    description:
        'Monthly book club in Elwood and St Kilda, Melbourne. Social meet-ups at local bars – members choose the book each month. Relaxed, low-key and welcoming. Find your local book club in Melbourne.',
    keywords: [
        'book club Melbourne',
        'book club Elwood',
        'book club St Kilda',
        'book club St Kilda East',
        'book club Balaclava',
        'book club Ripponlea',
        'book club Elsternwick',
        'book club Brighton',
        'book club Caulfield',
        'book club Prahran',
        'book club Albert Park',
        'monthly book club',
        'social',
        'social book club Melbourne',
        'relaxed book club',
        'low-key book club',
        'book club near me Melbourne',
        'book club local bars',
        'meet new people book club',
        'no pressure book club',
        'members choose book',
        'local book club',
        'Elwood book club',
        'St Kilda book club',
    ],
    openGraph: {
        title: 'Elwood Book Club – Melbourne',
        description:
            "Monthly social book club in Elwood and St Kilda, Melbourne. Meet at local bars, vote for the book, keep it relaxed. No pressure if you haven't finished – come along anyway.",
        locale: 'en_AU',
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link
                    rel="preconnect"
                    href="https://fonts.gstatic.com"
                    crossOrigin="anonymous"
                />
                <link
                    href="https://fonts.googleapis.com/css2?family=Courgette&family=Great+Vibes&family=Playwrite+NZ:wght@100..400&display=swap"
                    rel="stylesheet"
                />
                <script
                    dangerouslySetInnerHTML={{
                        __html: `(function(){try{var t=localStorage.getItem('ebc-theme');if(t==='high-contrast'||t==='alternative'||t==='dark')document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`,
                    }}
                />
            </head>
            <body
                className={`${geistSans.variable} ${geistMono.variable} antialiased`}
            >
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
