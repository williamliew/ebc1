import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
    return {
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
    };
}
