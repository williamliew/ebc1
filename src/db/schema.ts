import {
    date,
    integer,
    pgTable,
    serial,
    text,
    timestamp,
    varchar,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const nominationRounds = pgTable('nomination_rounds', {
    id: serial('id').primaryKey(),
    meetingDate: date('meeting_date', { mode: 'string' }).notNull().unique(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    winnerBookId: integer('winner_book_id').references(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (): any => nominationBooks.id,
        { onDelete: 'set null' },
    ),
});

export const nominationBooks = pgTable('nomination_books', {
    id: serial('id').primaryKey(),
    roundId: integer('round_id')
        .notNull()
        .references(() => nominationRounds.id, { onDelete: 'cascade' }),
    externalId: varchar('external_id', { length: 256 }).notNull(),
    title: text('title').notNull(),
    author: text('author').notNull(),
    coverUrl: text('cover_url'),
    blurb: text('blurb'),
    link: text('link'),
});

export const nominationRoundsRelations = relations(
    nominationRounds,
    ({ one, many }) => ({
        books: many(nominationBooks),
        winnerBook: one(nominationBooks, {
            fields: [nominationRounds.winnerBookId],
            references: [nominationBooks.id],
        }),
    }),
);

export const nominationBooksRelations = relations(
    nominationBooks,
    ({ one }) => ({
        round: one(nominationRounds),
    }),
);
