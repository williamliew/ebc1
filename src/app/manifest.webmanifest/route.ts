import { NextResponse } from 'next/server';

const manifest = {
    name: 'Elwood Book Club',
    short_name: 'Elwood Book Club',
    icons: [
        {
            src: '/favicon.ico',
            sizes: '48x48',
            type: 'image/x-icon',
            purpose: 'any',
        },
    ],
    start_url: '/',
    display: 'standalone',
} as const;

export function GET() {
    return NextResponse.json(manifest, {
        headers: {
            'Content-Type': 'application/manifest+json',
            'Cache-Control': 'public, max-age=86400',
        },
    });
}
