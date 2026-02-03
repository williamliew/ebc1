/**
 * Truncate all app tables (suggestions, suggestion_rounds, votes, vote_round_books, vote_rounds).
 * Run with: bun run scripts/clear-db.ts
 * Loads .env.local for DATABASE_URL (same as drizzle.config.ts).
 */
import { config } from 'dotenv';
import postgres from 'postgres';

config({ path: '.env.local' });

const url = process.env.DATABASE_URL;
if (!url) {
    console.error('DATABASE_URL not set. Set it in .env.local');
    process.exit(1);
}

const sql = postgres(url, { max: 1 });

async function main() {
    console.log(
        'Truncating tables (suggestions, vote_round_books, votes, suggestion_rounds, vote_rounds)...',
    );
    await sql.unsafe(`
        TRUNCATE TABLE suggestions, vote_round_books, votes, suggestion_rounds, vote_rounds
        RESTART IDENTITY CASCADE
    `);
    console.log('Done.');
    await sql.end();
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
