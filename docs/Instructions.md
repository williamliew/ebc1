# Instructions

1. Please refer to Description.md for background
2. Please refer to CV.md for my current CV for considerations
3. Please refer to Objective.md for goals and objectives
4. Then proceed with the questions below to provide me with initial suggestions

## Actions

1. Look on the internet for similar book clubs of similar size
2. Analyse their engagement tools, processes, and success
3. Based on the information provided, for now only make suggestions—don't create anything yet
4. Please suggest low-cost hosting and solution options

---

## Web page build

### Goal

Build a two-sided web application for a community "Book of the Month" vote. Admins curate a shortlist of books from a public book API; members view the options and vote. The app has distinct Admin and Public interfaces.

It'll mainly be targetted for phone use but can also work on desktop

### General architecture

- **Next.js 15** (App Router) + TypeScript
- **React Server Components** for main pages (speed, SEO)
- **Route Handlers** under `app/api/...`:
    - `POST /api/books/search` → calls book API (Open Library); no API key required
    - `GET/POST /api/nomination` → latest vote round and cached books; POST creates a new vote round (admin)
    - `GET /api/rounds` → list vote rounds
    - `GET /api/nextbook` → latest round winner and meeting date
    - `GET/POST /api/suggestion-rounds` → list or create suggestion rounds
    - `GET/POST /api/suggestions` → list or add suggestions (by round; optional tally)
    - `GET/POST /api/votes` → current open vote round + books; POST to cast a vote (one per voter key hash per round)
- **Tailwind CSS** for UI
- **TanStack Query** for admin search and client-side lists/votes
- **Supabase** for books and votes
- **Drizzle** for type-safe DB access
- **Zod** for validating request body and env
- **Auth.js** or **Clerk** for admin protection
- **Vercel** for deploy; env vars for DB and any API keys
- **Bun** as runtime (optional)
- **Email (potential)**: **Resend** – 3,000 emails/month free; simple API, works well with Next.js + Vercel. [resend.com](https://resend.com)

### API interaction layer

- **Integration**: Use the [Open Library API](https://openlibrary.org/developers/api)
- **Authentication**: No API key required; all calls are server-side via Route Handlers
- **Data fetching**:
    - Search by title or author: `GET https://openlibrary.org/search.json?title=...&author=...`
    - Retrieve full details for a work: `GET https://openlibrary.org/works/{key}.json` (e.g. `/works/OL19922194W`)
    - Cover images: `https://covers.openlibrary.org/b/id/{cover_id}-L.jpg`

### Admin capabilities

#### Voting page builder

- Page with a form where the admin can search a public book API and get title, cover, author, blurb
- Show top 5–10 results with title, cover, author and a "Select" button per result
- On "Select", add the item to the current list (store unique id); show a visual list of selected books (title and author only)
- Maximum 4 books in the list
- When at least 2 books are selected, show **Create** and **Reset** controls; Reset clears the list
- On Create, persist the list as the current nomination round and make it available for voting
- This ideally creates a cached copy of all the books selected for performance. I.e. the image, title, author, blurb is saved and served when viewing any subsequent page using this data. This cache will only be needed for the month and reset the next month

#### Question building page

- **Context**: The admin currently thinks up icebreaker questions for new members and creates a spread with a QR code to the WhatsApp group
- **Form**: Allow single or multiple text inputs for questions
- **Background**: Admin can select, generate, or upload a background image
- **Other text**: Title of the bookclub, book title,book author, maybe additional text can be printed added via input field
- **Preview**: In-page preview (book data will be fetched from the local cache stored ideally)
- **QR code**: Include QR code (e.g. to WhatsApp group) on the layout
- **Print**: Generate a printable page for the admin
- **Accessibility**: Consider semi-transparent background behind text (e.g. 0.5 opacity) for contrast; optional toggle for white or black text

### Public interface (voting & display)

- **Display**: Show the current shortlist (up to 4 books) side by side: title, author, large cover image
- **Blurb**: Book description hidden by default; reveal on interaction (e.g. "Read blurb" → lightbox or expand)
- **Voting**: Users can submit one vote per voting cycle; store votes securely in the DB
- **Link**: Book title or cover links to a purchase or detail page. (Leave this as an empty link for now)
- **Multiple votes** - Ideally we want to keep as little information about the user as possible as we dont want to store data on them. If we could, we could unique store device information or something thats hashed so that we can only allow 1 vote per device

### Data management

The database stores:

- **Suggestion rounds** (`suggestion_rounds`): periods when members can suggest books (label, close_at). When closed, /next is admin-only (tally view).
- **Suggestions** (`suggestions`): one row per book suggestion per round; max 2 per person per round (enforced in app); identifier is a hashed key (e.g. device/session), not PII.
- **Vote rounds** (`vote_rounds`): one per “month” (meeting_date, close_vote_at, selected_book_ids shortlist, optional winner_external_id). Created by admin in the voting page builder.
- **Vote round books** (`vote_round_books`): cached book details (title, author, cover, blurb, link) per shortlisted book per round.
- **Votes** (`votes`): one vote per person per round (unique on vote_round_id + voter_key_hash); stores chosen_book_external_id and hashed voter key only.

### Flow (four phases)

1. **Suggestions**: Admin opens a suggestion round. Members suggest books (e.g. on /next); max 2 per person per round. When the round closes, admin sees a tally.
2. **Shortlist**: Admin picks the top 2–4 books from the tally (or manually), uses the **Voting page builder** to search, select 2–4 books, set meeting date and close-vote date, and create the vote round. Cached book data is stored for the shortlist.
3. **Voting**: Public /vote shows the current shortlist; users submit one vote per round (identified by hashed key). Voting closes at close_vote_at.
4. **Result**: Admin can set the winner on the round; /nextbook (and any “next book” display) shows the winner and meeting date.

### Admin

1. Admin visits routes such as / (home), /voting-page-builder, /question-builder.

---

## Notes to explore later

### Sending emails (free or low cost)

With Vercel + Supabase, transactional email can be added via a third-party provider; many offer free or low-cost tiers.

- **Resend** – 3,000 emails/month free; simple API, works well with Vercel. [resend.com](https://resend.com)
- **Brevo (Sendinblue)** – 300 emails/day free. [brevo.com](https://www.brevo.com)
- **SendGrid** – 100 emails/day free forever. [sendgrid.com](https://sendgrid.com)
- **Mailgun** – Free trial, then pay-as-you-go. [mailgun.com](https://www.mailgun.com)
- **Postmark** – Low cost, strong deliverability. [postmarkapp.com](https://postmarkapp.com)
- **Amazon SES** – Very cheap per email; more setup (AWS, domain).

Implementation: add an API key to Vercel env (e.g. `RESEND_API_KEY`) and call the provider’s API from a Route Handler or server action when sending (e.g. after creating a round or recording a vote). Supabase Auth also has built-in email if you add auth later.
