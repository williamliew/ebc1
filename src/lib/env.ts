import { z } from 'zod';

const envSchema = z.object({
    DATABASE_URL: z.string().url().optional(),
    GOOGLE_BOOKS_API_KEY: z.string().min(1).optional(),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
    const parsed = envSchema.safeParse({
        DATABASE_URL: process.env.DATABASE_URL,
        GOOGLE_BOOKS_API_KEY: process.env.GOOGLE_BOOKS_API_KEY,
    });
    if (!parsed.success) {
        console.warn('Env validation warnings:', parsed.error.flatten());
    }
    return parsed.success ? parsed.data : ({} as Env);
}

export const env = loadEnv();
