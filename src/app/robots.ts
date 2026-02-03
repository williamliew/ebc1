import type { MetadataRoute } from 'next';

/**
 * Only the home page is intended for indexing. All other routes are for
 * members with intent (vote, nextbook, admin); we do not want crawlers
 * or indexers hitting them.
 */
export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: ['/admin', '/api', '/vote', '/nextbook'],
        },
    };
}
