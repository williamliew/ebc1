/**
 * Fetch helper for Open Library API calls.
 * When EBC_INSECURE_SSL_DEV=1 (e.g. local dev behind a corporate proxy with SSL inspection),
 * uses Node's https with rejectUnauthorized: false so requests succeed.
 * Never set EBC_INSECURE_SSL_DEV in production.
 */

import https from 'node:https';
import zlib from 'node:zlib';

const INSECURE_SSL_DEV =
    process.env.EBC_INSECURE_SSL_DEV === '1' ||
    process.env.EBC_INSECURE_SSL_DEV === 'true';

function fetchInsecure(url: string): Promise<{
    ok: boolean;
    status: number;
    json: () => Promise<unknown>;
    text: () => Promise<string>;
}> {
    return new Promise((resolve, reject) => {
        const u = new URL(url);
        const opts: https.RequestOptions = {
            hostname: u.hostname,
            port: u.port || 443,
            path: u.pathname + u.search,
            method: 'GET',
            rejectUnauthorized: false,
            headers: { 'Accept-Encoding': 'identity' },
        };
        https
            .get(opts, (res) => {
                const chunks: Buffer[] = [];
                res.on('data', (chunk: Buffer) => chunks.push(chunk));
                res.on('error', reject);
                res.on('end', () => {
                    const raw = Buffer.concat(chunks);
                    const status = res.statusCode ?? 0;
                    const encoding =
                        (res.headers['content-encoding'] ?? '')
                            .toLowerCase()
                            .trim() || 'identity';
                    const decode = (buf: Buffer): Promise<string> => {
                        if (encoding === 'gzip')
                            return new Promise((res, rej) =>
                                zlib.gunzip(buf, (err, out) =>
                                    err ? rej(err) : res(out.toString('utf8')),
                                ),
                            );
                        if (encoding === 'deflate')
                            return new Promise((res, rej) =>
                                zlib.inflate(buf, (err, out) =>
                                    err ? rej(err) : res(out.toString('utf8')),
                                ),
                            );
                        return Promise.resolve(buf.toString('utf8'));
                    };
                    decode(raw)
                        .then((body) =>
                            resolve({
                                ok: status >= 200 && status < 300,
                                status,
                                json: () => {
                                    if (!body || body.trim() === '')
                                        return Promise.resolve(null);
                                    try {
                                        return Promise.resolve(
                                            JSON.parse(body),
                                        );
                                    } catch {
                                        return Promise.reject(
                                            new Error(
                                                'Invalid JSON from Open Library',
                                            ),
                                        );
                                    }
                                },
                                text: () => Promise.resolve(body),
                            }),
                        )
                        .catch(reject);
                });
            })
            .on('error', reject);
    });
}

export async function fetchOpenLibrary(
    url: string,
): Promise<{ ok: boolean; status: number; json: () => Promise<unknown>; text: () => Promise<string> }> {
    if (INSECURE_SSL_DEV && url.startsWith('https://')) {
        return fetchInsecure(url);
    }
    const res = await fetch(url);
    return {
        ok: res.ok,
        status: res.status,
        json: () => res.json(),
        text: () => res.text(),
    };
}
