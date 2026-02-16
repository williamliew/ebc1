# Elwood Book Club – Web App

Base documentation for how this app functions. For club background and process, see repo root `Description.md` and `Instructions.md`.

---

## What the app does

Two-sided web app for a monthly “book of the month” vote:

- **Admins** build vote rounds (shortlist of 2–4 books from Open Library search), optionally protect voting with a password, and use a question builder to create printable spreads (e.g. icebreaker questions + QR code).
- **Members** view the current shortlist on the vote page, optionally enter a password, and submit one vote per round (one per device/person, stored via hashed identifier only).

The app also shows the **next book** (winner + meeting date) after the admin sets the winner.

**Suggest next book** – When a suggestion round is open, members can suggest up to 2 books per round. Each suggestion can include an **optional comment** (e.g. why they suggest it): rich text with bold, italic, underline only; max 350 characters; emoji picker available. Comments are sanitised and checked for safe-for-work language server-side. Viewers can toggle “Show comments” / “Hide comments” on the suggest page.

---

## Main routes

| Route                              | Who      | Purpose                                                                                                                                                                   |
| ---------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                                | Everyone | Home: links to Vote, Next book; admin panel link when logged in                                                                                                           |
| `/vote`                            | Members  | Current vote round: shortlist in a swipeable gallery, one vote per round; password form if round is protected                                                             |
| `/nextbook`                        | Everyone | Winning book and meeting date for the latest round                                                                                                                        |
| `/admin`                           | Admin    | Admin hub (links to Create a vote, Book of the month graphic, Vote results)                                                                                               |
| `/admin/login`                     | Admin    | Login to access admin routes                                                                                                                                              |
| `/admin/create-a-vote`             | Admin    | Search books, select 2–4, **review** (edit cover/title/author), then create the nomination round with meeting/close dates and optional vote password                      |
| `/admin/book-of-the-month-graphic` | Admin    | Build a printable spread: questions, book club title, book title/author, extra text, background, font/size, QR code; in-page and fullscreen preview, print                |
| `/suggestnextbook`                 | Members  | When suggestions are open: search books, suggest up to 2 per round; optional comment (350 characters, bold/italic/underline, emoji); toggle to show/hide others’ comments |

---

## How Create a vote works

1. **Search** – Title and/or author; results from Open Library (no API key). Pagination, “Read more” for blurbs.
2. **Select** – Up to 4 books; “Selected” list in a fixed footer with meeting date, close-vote date, optional vote access password.
3. **Review** – Button label is **Review** (not “Create vote”). Clicking it **slides the view right** to a review step:
    - Same shortlist in a **swipeable gallery** (like the vote page), with **dots** to jump to a book.
    - Each card: **cover image**, then inputs for **Cover URL**, **Title**, **Author** (pre-filled; edits fix bad/missing search data).
    - Fixed bottom: **Back** (slide left to builder), **Create** (creates the round using the reviewed data).
4. **Create** – Sends the reviewed books (including any overrides for cover/title/author) to `POST /api/nomination`. Round and cached book rows are stored; vote page and nextbook use this data.

The builder panel and review panel are each full viewport width (100vw); the slide is a horizontal transform between the two.

---

## How the vote page works

- **GET /api/votes** – Returns current open round, books (cached), and optionally `alreadyVoted` / `chosenBookExternalId` when `X-Voter-Key-Hash` is sent.
- If the round has a **vote access password**, the page shows a password form first; after success, an HttpOnly cookie is set and the books/vote UI are shown.
- Shortlist is shown in a **swipeable gallery** (touch or mouse); **dots** indicate and select the current book.
- **Vote for this** – Submits the currently visible book; one vote per voter key hash per round; “You’ve already voted” if applicable.

---

## How the question builder works

- **Form** – Book club title, book title/author (from latest nomination or manual), additional rich text, one or more questions, background (preset / gradient / upload / URL), text colour, **preview font** (Playwrite NZ, Great Vibes, Courgette), **font size** slider, QR URL.
- **Preview** – In-page and “Preview in full screen to screenshot”; font and size apply to both.
- **Print** – Print action shows only the preview card (CSS print visibility).

---

## Book data (Open Library)

- **Search**: `POST /api/books/search` (title, author, page) → calls Open Library search API.
- **Details**: Work keys (e.g. `/works/OL19922194W`); covers from `covers.openlibrary.org`. No API key. See `Instructions.md` for API details.
- **Nomination create** accepts optional **title**, **author**, **coverUrl** per book so the review step corrections are persisted.

---

## Vote access password

- **Admin**: Optional “Vote access password” in the Create a vote footer. If set, the round is protected.
- **Voters**: On `/vote`, a form is shown until the correct password is entered; then an HttpOnly, signed cookie is set for that round and the books/vote UI are shown. Stored and checked server-side.

---

## Theming and accessibility

- **Theme switcher** (top-right): Default (Elwood brand), high-contrast, alternative (warm). Stored in `localStorage`; CSS variables in `app/globals.css`. New UI should use theme variables (see `docs/THEMING.md` and `.cursorrules`).
- **Logo** – `EbcLogo` uses theme primary; docs in `docs/LOGO-ACCESSIBILITY.md`.

---

## Tech stack

- **Next.js 15** (App Router), TypeScript, Tailwind CSS
- **TanStack Query** for admin search and client data
- **Drizzle** + SQLite (or other DB via env) for rounds, books, votes
- **Zod** for validation (API bodies, env)
- **Open Library** for book search and details (no API key)
- **Rate limiting** (in-memory per IP) on login, vote verify, book search, vote submit
- **Security**: See `SECURITY.md`; headers in `next.config.ts`
- **Email (potential)**: **Resend** – free tier, simple API; suitable for transactional email (e.g. notifications). [resend.com](https://resend.com)

---

## Getting started

```bash
cd ebc1
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Env: see `.env.local.example` (DB, admin credentials).

**Local vs deploy:** For a clear split of what to do locally vs when deploying to Vercel + Supabase, see **`docs/DEPLOYMENT-LOCAL-VS-VERCEL-SUPABASE.md`**. Full deployment guide: repo root **Deployment.md**.

### Local development: clear the DB and re-push schema

When using the Docker database locally, you can wipe tables and reapply the schema:

1. Clear the tables in the Docker DB (e.g. run the SQL to drop tables, or use your DB client).
2. From the `ebc1` directory, run:

    ```bash
    bun run db:push
    ```

    This reapplies the Drizzle schema so you start with a clean DB. Handy after schema changes or when you want to reset local data without digging through terminal history.

---

## Other docs

- **Description.md** (repo root) – Club overview, monthly process, platforms
- **Instructions.md** (repo root) – Build goals, API list, data model, flows
- **Deployment.md** (repo root) – Hosting and env
- **docs/DEPLOYMENT-LOCAL-VS-VERCEL-SUPABASE.md** – What to do locally vs when deploying to Vercel + Supabase
- **SECURITY.md** – Security mitigations and residual risks
- **docs/THEMING.md** – Theme variables and usage
- **docs/LOGO-ACCESSIBILITY.md** – Logo contrast and usage
