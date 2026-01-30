import {
    date,
    integer,
    pgTable,
    serial,
    timestamp,
    varchar,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const monthlyBook = pgTable('monthly_book', {
    id: serial('id').primaryKey(),
    meetingDate: date('meeting_date', { mode: 'string' }).notNull().unique(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    winnerExternalId: varchar('winner_external_id', { length: 256 }),
});

export const monthlyBookSelections = pgTable('monthly_book_selections', {
    id: serial('id').primaryKey(),
    monthlyBookId: integer('monthly_book_id')
        .notNull()
        .references(() => monthlyBook.id, { onDelete: 'cascade' }),
    meetingDate: date('meeting_date', { mode: 'string' }).notNull(),
    externalId: varchar('external_id', { length: 256 }).notNull(),
});

export const monthlyBookRelations = relations(monthlyBook, ({ many }) => ({
    selections: many(monthlyBookSelections),
}));

export const monthlyBookSelectionsRelations = relations(
    monthlyBookSelections,
    ({ one }) => ({
        monthlyBook: one(monthlyBook),
    }),
);
