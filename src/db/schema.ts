import {
    date,
    integer,
    pgTable,
    serial,
    text,
    timestamp,
    unique,
    varchar,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

/**
 * One row per "suggestions open" period. When close_at is set and in the past,
 * suggestions are closed. "Open suggestions for" = which month/meeting this is for.
 */
export const suggestionRounds = pgTable('suggestion_rounds', {
    id: serial('id').primaryKey(),
    /** Date label e.g. "Open suggestions for" (same day, one month forward). */
    suggestionsForDate: date('suggestions_for_date', { mode: 'string' }),
    label: varchar('label', { length: 64 }),
    closeAt: timestamp('close_at', { withTimezone: true }),
    /** Optional password to access /suggestnextbook for this round. */
    suggestionAccessPassword: varchar('suggestion_access_password', {
        length: 256,
    }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * One row per member suggestion. Max 2 suggestions per person per round (enforced in app).
 * Cached book details so we can show list without calling Open Library.
 */
export const suggestions = pgTable('suggestions', {
    id: serial('id').primaryKey(),
    suggestionRoundId: integer('suggestion_round_id')
        .notNull()
        .references(() => suggestionRounds.id, { onDelete: 'cascade' }),
    bookExternalId: varchar('book_external_id', { length: 256 }).notNull(),
    suggesterKeyHash: varchar('suggester_key_hash', { length: 256 }).notNull(),
    title: varchar('title', { length: 512 }),
    author: varchar('author', { length: 512 }),
    coverUrl: text('cover_url'),
    blurb: text('blurb'),
    link: text('link'),
    /** Optional comment with the suggestion (rich text, sanitised; max 350 characters enforced in API). */
    comment: text('comment'),
    /** Optional name shown with the comment; null/blank is displayed as "Anonymous". */
    commenterName: varchar('commenter_name', { length: 128 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * One row per vote round. Created by admin in vote-page-builder.
 * When a row exists, /vote is public until close_vote_at has passed.
 */
export const voteRounds = pgTable('vote_rounds', {
    id: serial('id').primaryKey(),
    meetingDate: date('meeting_date', { mode: 'string' }).notNull().unique(),
    closeVoteAt: timestamp('close_vote_at', { withTimezone: true }),
    selectedBookIds: text('selected_book_ids').array().notNull(),
    winnerExternalId: varchar('winner_external_id', { length: 256 }),
    /** Optional password to view/vote this round (anti-spam). Null = no gate. */
    voteAccessPassword: varchar('vote_access_password', { length: 256 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * Cached book details per vote round (title, author, cover, blurb, link).
 */
export const voteRoundBooks = pgTable('vote_round_books', {
    id: serial('id').primaryKey(),
    voteRoundId: integer('vote_round_id')
        .notNull()
        .references(() => voteRounds.id, { onDelete: 'cascade' }),
    externalId: varchar('external_id', { length: 256 }).notNull(),
    title: varchar('title', { length: 512 }).notNull(),
    author: varchar('author', { length: 512 }).notNull(),
    coverUrl: text('cover_url'),
    blurb: text('blurb'),
    link: text('link'),
});

/**
 * One row per member vote. One vote per person per round (unique on vote_round_id + voter_key_hash).
 */
export const votes = pgTable(
    'votes',
    {
        id: serial('id').primaryKey(),
        voteRoundId: integer('vote_round_id')
            .notNull()
            .references(() => voteRounds.id, { onDelete: 'cascade' }),
        chosenBookExternalId: varchar('chosen_book_external_id', {
            length: 256,
        }).notNull(),
        voterKeyHash: varchar('voter_key_hash', { length: 256 }).notNull(),
        createdAt: timestamp('created_at').defaultNow().notNull(),
    },
    (t) => [unique('votes_round_voter').on(t.voteRoundId, t.voterKeyHash)],
);

export const suggestionRoundsRelations = relations(
    suggestionRounds,
    ({ many }) => ({
        suggestions: many(suggestions),
    }),
);

export const suggestionsRelations = relations(suggestions, ({ one }) => ({
    suggestionRound: one(suggestionRounds),
}));

export const voteRoundsRelations = relations(voteRounds, ({ many }) => ({
    votes: many(votes),
    books: many(voteRoundBooks),
}));

export const voteRoundBooksRelations = relations(voteRoundBooks, ({ one }) => ({
    voteRound: one(voteRounds),
}));

export const votesRelations = relations(votes, ({ one }) => ({
    voteRound: one(voteRounds),
}));

/**
 * Book of the month: set by admin (from vote or manually). One row per set;
 * "current" is the latest by id. Used by /nextbook and Eventbrite form.
 */
export const bookOfTheMonth = pgTable('book_of_the_month', {
    id: serial('id').primaryKey(),
    meetingDate: date('meeting_date', { mode: 'string' }).notNull(),
    externalId: varchar('external_id', { length: 256 }).notNull(),
    title: varchar('title', { length: 512 }).notNull(),
    author: varchar('author', { length: 512 }).notNull(),
    coverUrl: text('cover_url'),
    blurb: text('blurb'),
    link: text('link'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});
