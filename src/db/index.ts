import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '@/lib/env';
import * as schema from './schema';

const connectionString = env.DATABASE_URL;

if (!connectionString) {
    console.warn(
        'DATABASE_URL not set; nomination create/fetch will not work until configured.',
    );
}

const client = connectionString ? postgres(connectionString, { max: 1 }) : null;

export const db = client ? drizzle(client, { schema }) : null;
