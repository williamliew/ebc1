import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

// Load .env.local so db:push uses the same DATABASE_URL as the app
config({ path: '.env.local' });

export default defineConfig({
    schema: './src/db/schema.ts',
    out: './drizzle',
    dialect: 'postgresql',
    dbCredentials: {
        url: process.env.DATABASE_URL ?? 'postgres://localhost:5432/ebc1',
    },
});
