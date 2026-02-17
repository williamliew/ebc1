# Deployment Guide

Recommended approach: **Vercel + Supabase**. No server to manage, no SSH, no installing Node or Postgres yourself.

---

## 1. Hosting: Vercel

- **What it does:** Builds and runs your Next.js app. Handles HTTPS, scaling, and a global CDN.
- **Flow:** Connect your GitHub repo (`williamliew/ebc1`) to Vercel. Every push to `main` can auto-deploy.
- **Cost:** Free tier is enough for a small book club app.

### Steps

1. Sign up at [vercel.com](https://vercel.com) (e.g. with GitHub).
2. **Add New Project** → import `williamliew/ebc1`.
3. Set **Root Directory** to the repo root (where `package.json` is).
4. Add **Environment Variables** (see section 3 below).
5. Deploy. Vercel gives you a URL like `ebc1.vercel.app`.

**Preview without a domain:** You can use that `*.vercel.app` URL straight away to preview and share the app. Add a custom domain later when you're ready (see section 4).

You never “shell into” Vercel; you only use the dashboard and env vars.

---

## 2. Database: local (dev) and Supabase (production)

- **Development:** Use a local Postgres so you can work without touching the live DB. The repo includes a `docker-compose.yml` for this.
- **Production:** Use Supabase (hosted Postgres). Set `DATABASE_URL` in Vercel to your Supabase connection string.

### Local development (recommended)

1. From the `ebc1` directory, start Postgres:
    ```bash
    docker compose up -d
    ```
2. Copy `.env.local.example` to `.env.local` and set:
    ```bash
    DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ebc1
    ```
    (Book search uses Open Library; no API key required.)
3. Create tables once:
    ```bash
    bun run db:push
    ```
4. Run the app: `bun run dev`. The voting builder and nomination APIs will use the local DB.

### Production (Supabase)

1. Sign up at [supabase.com](https://supabase.com), create a project.
2. Get your **database connection string** (this is not the same as the Supabase project URL like `https://xxxx.supabase.co`):
   - In Supabase, open your **project** (click it from the dashboard so you’re inside the project).
   - At the **top of the project page**, click the **Connect** button (not the gear icon). In the panel that opens you’ll see connection options (e.g. **Direct**, **Session**, **Transaction**).
   - Choose **Transaction** (port **6543**). Copy the URI shown there. It may look like `postgres://postgres.[ref]:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres` or, on some projects, `postgres://postgres:[YOUR-PASSWORD]@db.xxxx.supabase.co:6543/postgres`.
   - Replace `[YOUR-PASSWORD]` with your database password (set when you created the project, or reset under **Project Settings** → **Database**).
   - **If you only see “Direct connection”:** That’s usually under **Project Settings** (gear) → **Database**. The Connect button is on the main project overview. If you truly only have the direct string, try changing its port from **5432** to **6543** (same host); that uses the transaction pooler. If you still get `ENOTFOUND`, your project may be **paused** — open the project in the dashboard and click **Restore**, then try again.
3. **Create the tables in Supabase once** — from your own computer (in the project folder, in a terminal), run this command so that the app’s tables (vote rounds, suggestions, votes, etc.) are created in your Supabase database. You only need to do this once when first setting up production:
    ```bash
    DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres" bun run db:push
    ```
   Replace the whole `DATABASE_URL="..."` value with the connection string you copied in step 2 (including your real password). This runs the schema migration against your Supabase database; after that, your app can use that database.
4. Set `DATABASE_URL` in Vercel (Project → Settings → Environment Variables) to that same Supabase connection string. Never commit it to the repo.

**If you see `getaddrinfo ENOTFOUND db.xxxx.supabase.co`:** Your URL is using the direct database host. In Supabase go to **Project Settings → Database**, under **Connection string** pick **URI**, then select **Transaction** (port 6543) and copy that string. It must contain `pooler.supabase.com`, not `db....supabase.co`. Update `.env.local` (and Vercel env vars) with that URI. If your project was paused (free tier), open the project in the Supabase dashboard and click **Restore** first.

### Resetting the production database (Supabase)

If you need to wipe the production database and start again:

1. **Reset the database in Supabase** — In the [Supabase](https://supabase.com) dashboard, go to **Project Settings** (gear icon) → **Database**. Use **Reset database** (or delete and recreate the database if your plan allows). That removes all data and tables.
2. **Recreate the schema** — From your machine, in the project folder, run the same command as in step 3 above, with your Supabase connection string:
    ```bash
    DATABASE_URL="your-supabase-connection-string" bun run db:push
    ```
   That recreates all the app tables. After that you have a fresh database with the correct schema.

---

## 3. Environment Variables

These are the “server requirements” — config, not something you install.

### Local development (`.env.local`)

| Variable           | Description                                                                                                            |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`     | Local: `postgresql://postgres:postgres@localhost:5432/ebc1` (see section 2).                                           |
| `ADMIN_PASSWORD`   | Optional. When set, `/admin` requires this password. **Leave unset locally** to skip auth and test without logging in. |
| `GEMINI_API_KEY`   | Optional. Google Gemini API key for AI blurb and cover lookup (suggest next book, create vote, book of the month). Use `GOOGLE_API_KEY` instead if you prefer. Server-only; never committed. |

Book search and details use the [Open Library API](https://openlibrary.org/developers/api); no API key is required.

Copy `.env.local.example` to `.env.local` and fill in the values. Never commit `.env.local`.

### Production (Vercel → Project → Settings → Environment Variables)

| Variable           | Description                                                                                                                                                 |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`     | **Supabase** Postgres connection string (Settings → Database → Connection string → URI, Transaction pooler). Not the project URL (`https://xxx.supabase.co`). |
| `ADMIN_PASSWORD`   | **Recommended.** A password string to protect `/admin` (login page). Set this in production so only you can access the voting builder and question builder. |
| `GEMINI_API_KEY`   | Optional. Google Gemini API key for AI blurb and cover lookup. Use `GOOGLE_API_KEY` instead if you prefer. Server-only.                                      |

Vercel injects these at build and runtime. Use the **Supabase** URL here, not the local one.

---

## 4. Domain (optional)

You can run and preview the app on the default Vercel URL (`ebc1.vercel.app`) indefinitely. A custom domain is only for a nicer address (e.g. `bookclub.yourdomain.com`).

- **Buy (when you want one):** Any registrar (e.g. Namecheap, Google Domains, Cloudflare, Porkbun).
- **Use with Vercel:**
    1. In Vercel: **Project → Settings → Domains** → Add your domain (e.g. `bookclub.yourdomain.com`).
    2. Vercel shows the DNS records (usually CNAME or A).
    3. In your registrar’s DNS, add that CNAME (or A) as Vercel instructs.
    4. Wait for DNS (minutes to hours). Vercel issues HTTPS automatically.

---

## 5. Deployment Strategy

- **Code:** In GitHub (`williamliew/ebc1`).
- **CI/CD:** Vercel “build on push”. Push to `main` → Vercel builds and deploys.
- **Preview:** Every PR can get a URL like `ebc1-git-branch-username.vercel.app` for testing.
- **Production:** Deploys from `main` at `ebc1.vercel.app` or your custom domain.
- **Database:** **Local dev** → local Postgres (`docker compose`, `DATABASE_URL` in `.env.local`). **Production** → Supabase (`DATABASE_URL` in Vercel). Same schema; different URLs.
- **Secrets:** Only in `.env.local` (dev) and Vercel env vars (production); never in the repo.

---

## 6. Practical Checklist

**Local development**

1. **Local DB:** Run `docker compose up -d` in `ebc1` → copy `.env.local.example` to `.env.local` → set `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ebc1`.
2. **Tables:** Run `bun run db:push` once.
3. **Run:** `bun run dev` → use voting builder etc. against the local DB.

**Production**

1. **Supabase:** Create project → get `DATABASE_URL` (Transaction pooler) → run `DATABASE_URL="your-supabase-url" bun run db:push` once to create tables.
2. **Vercel:** Import `ebc1` from GitHub → add **Supabase** `DATABASE_URL` (and `ADMIN_PASSWORD` if you want to protect `/admin`) → deploy.
3. **Test:** Open the Vercel URL; test voting builder and question builder; confirm DB works.
4. **Domain (optional):** Buy domain → add in Vercel → point DNS at Vercel.
5. **Ongoing:** Push to `main` → Vercel redeploys automatically.

---

## 7. When You Would Use a Server / SSH

- **VPS (e.g. DigitalOcean, Linode):** You’d SSH in and install Node, Postgres, Nginx, etc. More control, more ops work. Not needed for this Next.js + Supabase setup.
- **“Shell into the server”:** Only if you run your own server. With Vercel + Supabase you use dashboards and the Vercel CLI (e.g. for logs and env); there is no server to SSH into.

---

## 8. Quota simulation (Open Library & Supabase)

**Use case:** Elwood Book Club — one admin, ~550 Instagram followers, monthly cycle (one suggestion round → one vote round → one winner). Public pages: vote shortlist, next book, question builder (uses latest nomination).

### How `vote_round_books` reduces Open Library API use

- **Vote round creation:** When the admin creates a vote round, we fetch 2–4 book details from Open Library **once** and store them in `vote_round_books`. That is the only time we call Open Library for those books.
- **Vote page:** Shortlist is served from `vote_round_books` → **0** Open Library requests per view.
- **Next book page:** Winner details are read from `vote_round_books` (winner is one of the shortlisted books) → **0** Open Library requests per view.
- **Question builder:** Uses nomination API, which returns cached books from `vote_round_books` → **0** Open Library requests.
- **Book search (voting builder):** Each admin search calls Open Library (search + work details). Admin-only and occasional.

So after implementing cache-first for the winner (nextbook), **Open Library is only used for:** (1) 2–4 work-detail requests when creating a vote round per month, (2) search + work-detail requests per admin search. Open Library does not require an API key and is free to use.

### Supabase (free tier)

- **Database:** 500 MB. **Bandwidth:** 10 GB/month (5 GB cached + 5 GB uncached). **API requests:** Unlimited. **MAU:** 50,000.
- **Simulated usage:**
    - **Rows per month:** One vote round → 1 row in `vote_rounds`, 2–4 in `vote_round_books`, maybe 20–100 in `votes`, plus suggestion round data. Total growth is small (e.g. under 1 MB per month).
    - **Traffic:** A few hundred members viewing vote page, nextbook, home — each page load is mostly HTML/JS/CSS from Vercel; DB egress is small (shortlist JSON, etc.). Even 1,000 page views/month with a few KB each is well under 10 GB.
    - **MAU:** Dozens to a few hundred unique visitors is far below 50,000.

**Conclusion:** Supabase free tier is sufficient for this use case; you are unlikely to exceed database size, bandwidth, or MAU limits.
