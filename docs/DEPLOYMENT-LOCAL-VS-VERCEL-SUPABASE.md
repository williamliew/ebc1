# Local vs Vercel + Supabase: what to do where

This doc spells out what you do **locally** (development) vs **when deploying** to Vercel and Supabase. For full deployment detail, see the repo root **Deployment.md**.

---

## Quick reference

| Task | Local | Vercel + Supabase |
|------|--------|-------------------|
| Run the app | `npm run dev` (or `bun run dev`) | Automatic on push; or trigger deploy in Vercel dashboard |
| Database | Docker Postgres (`docker compose up -d`) + `db:push` | Supabase project; run `db:push` once with Supabase URL |
| Env / secrets | `.env.local` (never commit) | Vercel → Project → Settings → Environment Variables |
| Schema changes | Edit `src/db/schema.ts` → `npm run db:push` | Same; then run `db:push` with `DATABASE_URL` set to Supabase, then redeploy |
| Admin auth | Optional: set `ADMIN_PASSWORD` in `.env.local` or leave unset to skip login | **Set** `ADMIN_PASSWORD` in Vercel so `/admin` is protected |
| Eventbrite (create event) | Optional: set both vars to test; leave unset to skip | Optional: set in Vercel if you use “Create event on Eventbrite” |

---

## Local development

### 1. One-time setup

- **Node:** Use Node 18+ (or Bun). From project root `ebc1`:
  ```bash
  npm install
  ```
- **Database:** Start local Postgres:
  ```bash
  docker compose up -d
  ```
- **Env:** Copy `.env.local.example` to `.env.local` and set at least:
  ```bash
  DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ebc1
  # ADMIN_PASSWORD=   # optional; leave unset to skip admin login locally
  ```
- **Tables:** Create schema in the local DB:
  ```bash
  npm run db:push
  ```
  (Uses `DATABASE_URL` from `.env.local` via `drizzle.config.ts`.)

### 2. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The app uses the local Postgres and `.env.local`. No Vercel or Supabase needed.

### 3. When you change the schema

- Edit `src/db/schema.ts`.
- Then:
  ```bash
  npm run db:push
  ```
  This updates the **local** DB (because `DATABASE_URL` in `.env.local` points at Docker). For production you’ll run `db:push` again with the Supabase URL (see below).

### 4. Optional: Eventbrite (create event)

- To test “Create event on Eventbrite” locally, add to `.env.local`:
  ```bash
  EVENTBRITE_PRIVATE_TOKEN=your_token
  EVENTBRITE_ORGANIZATION_ID=your_org_id
  ```
- If these are unset, the API returns 503 and the UI can show a “not configured” message. Safe to leave unset for day-to-day dev.

---

## Deploying to Vercel + Supabase

### 1. One-time: Supabase project

- Create a project at [supabase.com](https://supabase.com).
- In **Settings → Database**, copy the **Connection string** (URI). Use the **Transaction** pooler (port **6543**) for serverless.
- Create tables in that DB (run once from your machine with the Supabase URL):
  ```bash
  DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres" npm run db:push
  ```
  Replace the string with your actual Supabase connection URI. After this, your Supabase DB has the same schema as local.

### 2. One-time: Vercel project

- Connect the repo to Vercel (e.g. [vercel.com](https://vercel.com) → Add New Project → import from GitHub).
- Set **Root Directory** to the folder that contains `package.json` (e.g. `ebc1` if the repo root is above it).
- In **Project → Settings → Environment Variables**, add:

  | Variable | Where to use | Value |
  |----------|----------------|-------|
  | `DATABASE_URL` | Production (and Preview if you want) | Supabase connection string (Transaction pooler, port 6543) |
  | `ADMIN_PASSWORD` | Production (and Preview if you want) | A strong password; required to access `/admin` in production |

  Optional (only if you use Eventbrite):

  | Variable | Value |
  |----------|--------|
  | `EVENTBRITE_PRIVATE_TOKEN` | Your Eventbrite API private token |
  | `EVENTBRITE_ORGANIZATION_ID` | Your Eventbrite organisation ID |

- Deploy (e.g. push to `main` or click Deploy in the dashboard).

### 3. After schema changes

- Update `src/db/schema.ts` and push code.
- Run **once** against the **production** DB so Supabase has the new schema:
  ```bash
  DATABASE_URL="your-supabase-connection-string" npm run db:push
  ```
- Vercel will redeploy from the new code. No need to “migrate” inside Vercel; the app just needs the DB to already have the tables (from your local `db:push` with Supabase URL).

### 4. What you don’t do on Vercel

- You don’t run `db:push` *on* Vercel. You run it from your machine (or CI) with `DATABASE_URL` set to the Supabase URL.
- You don’t SSH into a server. Config is env vars in the Vercel dashboard.
- You don’t install Postgres or Node on a server; Vercel runs the Next.js app, Supabase runs Postgres.

---

## Env summary

| Variable | Local (`.env.local`) | Vercel (Production) |
|----------|----------------------|----------------------|
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/ebc1` (Docker) | Supabase Transaction pooler URI (port 6543) |
| `ADMIN_PASSWORD` | Optional; leave unset to skip login | **Set** to protect `/admin` |
| `EVENTBRITE_PRIVATE_TOKEN` | Optional (test only) | Optional (if using Eventbrite) |
| `EVENTBRITE_ORGANIZATION_ID` | Optional (test only) | Optional (if using Eventbrite) |

Never commit `.env.local` or put production secrets in the repo. Vercel injects env vars at build and runtime.

---

## Checklist

**Local**

1. `docker compose up -d` in `ebc1`.
2. `.env.local` with `DATABASE_URL` pointing at local Postgres.
3. `npm run db:push` once (and after schema changes).
4. `npm run dev` to run the app.

**Vercel + Supabase**

1. Supabase project created; connection string (Transaction pooler) copied.
2. `DATABASE_URL="<supabase-uri>" npm run db:push` run once (and after schema changes).
3. Vercel project connected to repo; root directory set to `ebc1` (or wherever `package.json` is).
4. In Vercel: `DATABASE_URL` and `ADMIN_PASSWORD` set; optionally Eventbrite vars.
5. Deploy (push to `main` or manual deploy). App uses Supabase and Vercel env.
