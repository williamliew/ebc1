# Elwood Book Club – App Flow

This document describes the intended flow for selecting the book of the month and using it in the app. Use it for context and documentation.

---

## Overview

The process starts when the **admin opens the floor** for members to submit book suggestions. The **vote round** is then created from the **most suggested books** (e.g. top 2–4 by suggestion count). After voting closes, the admin manually creates the Book of the month; the app does not auto-create it from the vote winner.

---

## The flow (step by step)

### 1. Admin opens the floor for suggestions

- The admin **opens the floor** so that members can submit book suggestions (e.g. via a suggestions page or form).
- Members suggest books (search Open Library, add title/author, optional notes). Multiple members can suggest the same book; the app tracks suggestion counts.

### 2. Admin creates the vote round from the most suggested books

- When ready, the admin uses **Create a vote** (`/admin/create-a-vote`).
- The shortlist is built from the **most suggested books** (e.g. top 2–4 by number of suggestions). The admin may review and adjust (cover/title/author), set a **vote access password** if desired, then **Create**.
- This creates a **vote round** with meeting date and close-vote date. No “book of the month” exists yet.

### 3. Members vote

- Members go to the **Vote** page (`/vote`).
- If the round has a password, they enter it to access the shortlist.
- Each member votes for **one** book. One vote per person/device per round (stored via hashed identifier).

### 4. Admin sees the results

- The admin visits a page that **lists the total votes for each book** in that round.

### 5. Admin creates the “Book of the month”

- After voting closes, the admin **fills out a form** that creates the **Book of the month**.
- The form includes the winning book details and an **end date** (typically the **monthly meeting date** when the club discusses the book).
- This is a **manual, explicit step**: the app does not auto-create the book of the month from the vote winner.

### 6. Book of the month graphic uses the latest Book of the month

- The **Book of the month graphic** page (`/admin/book-of-the-month-graphic`) **pulls the latest “Book of the month”** (not the latest vote round or suggestion round).
- Until the admin has created at least one book of the month, that data is empty; the admin enters book title/author manually. Once a book of the month exists, the question builder can prefill from it so the admin can build the spread (body text, QR code, background, etc.) for that book.

---

## Summary

| Step | Who     | What happens                                                                                                       |
| ---- | ------- | ------------------------------------------------------------------------------------------------------------------ |
| 1    | Admin   | Opens the floor; members submit book suggestions (suggestion counts are tracked).                                 |
| 2    | Admin   | Creates vote round from the most suggested books (e.g. top 2–4), optional password, then Create.                    |
| 3    | Members | Enter password if required, then vote for one book each on `/vote`.                                               |
| 4    | Admin   | Views a page that lists total votes per book.                                                                      |
| 5    | Admin   | Fills out a form to create the “Book of the month” and set its end date (e.g. meeting date).                       |
| 6    | Admin   | Book of the month graphic pulls the latest Book of the month for the spread; until then, book is entered manually.  |

---

## Related docs

- **Description.md** – Club overview and monthly process.
- **Instructions.md** – Build goals, API list, data model.
- **ebc1/README.md** – How the app works (routes, suggestions, Create a vote, vote page, Book of the month graphic, APIs).
