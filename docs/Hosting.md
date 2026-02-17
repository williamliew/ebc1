# Hosting plans

Outline of hosting options from initial/small projects through to a larger, scalable setup, with **Vultr** highlighted as a viable and affordable option. See also **Deployment.md** for the current Vercel + Supabase workflow.

---

## Phase 1: Initial to small projects

**Goal:** Low cost, minimal ops, fast to ship. Suited to side projects, MVPs, and small user bases (e.g. a single book club).

### Recommended options

| Option | Pros | Cons | Typical cost |
|--------|------|------|----------------|
| **Vercel + Supabase** | No server to manage, global CDN, auto-deploy from Git. Supabase free tier for DB. | Cost grows with traffic/usage; less control. | Free tier → ~\$20–50/mo as you grow |
| **Railway** | Simple app hosting, good DX, scales with usage. | Less “your server” than a VPS. | Free/low tier, then usage-based |
| **Render** | Free tier for web services, managed. | Cold starts on free tier; limits. | Free → paid plans |
| **Vultr (small VPS)** | Full control, predictable price, Sydney DC for AU/NZ. | You (or automation) manage OS, Node, SSL, deploys. | ~\$6–12/mo |

**When to stay here:** Traffic and usage fit within free or low-cost tiers; you’re okay with platform limits and don’t need long-running processes or heavy customisation.

---

## Phase 2: Larger / scalable option

**Goal:** More control, predictable or lower cost at higher traffic, better fit for AU/NZ latency.

### When to consider moving

- Vercel (or similar) bills are climbing with traffic or serverless invocations.
- You want a single, long-running Node process (e.g. always-on Next.js) instead of serverless.
- You want full control over the stack (Node version, system packages, cron, etc.).

### Recommended: Vultr (and alternatives)

**Vultr** is a strong option for this phase:

- **Sydney and Auckland** data centres → low latency for Australia and New Zealand.
- **Predictable pricing:** e.g. ~\$6/mo for a small VPS; scale up by adding larger instances or more nodes.
- **No per-request or bandwidth surprise:** You pay for the server (and optionally backups), not per invocation.
- **Same stack:** Run Next.js (`next start`), keep using Supabase or move Postgres elsewhere (e.g. managed Postgres, or Postgres on the same/different VPS).

**Typical setup:**

1. Create a Vultr instance (e.g. Sydney), Ubuntu or similar.
2. Install Node (or use a Docker image), clone repo, build (`bun run build`), run with PM2 or systemd (`next start`).
3. Put Nginx (or Caddy) in front for HTTPS (e.g. Let’s Encrypt) and optional static/cache.
4. Use GitHub Actions (or an “AI agent” / scripts) to deploy on push: SSH + pull + build + restart.

**Other scalable options in the region:**

- **DigitalOcean** – Sydney; similar VPS model, ~\$6/mo.
- **Linode (Akamai)** – Sydney; comparable to DO/Vultr.
- **Oracle Cloud** – Free tier with always-free VMs; can be \$0 for light workloads; more setup.
- **Fly.io** – Edge/platform model; Sydney presence; pay-per-use; good if you want global edge without managing a single server.

---

## Summary: Vultr as a viable option

- **Phase 1:** You can start on Vultr with a small VPS (~\$6/mo) and run the app there from day one if you prefer a server over Vercel.
- **Phase 2:** When you outgrow or want to leave Vercel, **Vultr is a natural target**: same region (Sydney/Auckland), predictable cost, full control, and easy to automate (CI/CD or agent-assisted deploy and maintenance).

No lock-in: the app is standard Next.js + Postgres; it runs on any Node host.

---

## Data migration plan (existing content)

When moving from one host to another (e.g. Vercel → Vultr, or between VPS providers), use this as a checklist so existing content and config are not lost.

### 1. Database (Supabase or other Postgres)

- **Option A – Keep Supabase:** Point the new host’s app at the same `DATABASE_URL`. No DB migration; only the app moves.
- **Option B – Move DB to a new provider:**
  1. **Dump from source:**  
     `pg_dump "postgresql://..." > backup.sql` (or use Supabase dashboard → Backups if available).
  2. **Create DB on target:** e.g. new Supabase project, or managed Postgres (Vultr, DO, Neon, etc.), or Postgres on your VPS.
  3. **Restore:**  
     `psql "postgresql://new-connection-string" < backup.sql`
  4. **Point app:** Set `DATABASE_URL` on the new host to the new connection string.
  5. **Run migrations if needed:** If schema changed since dump, run `bun run db:push` or your Drizzle migrations against the new DB.

### 2. Environment variables

- List every variable used in production (see **Deployment.md** and `.env.local.example`): e.g. `DATABASE_URL`, `ADMIN_PASSWORD`, any API keys.
- Recreate them on the new host (Vercel dashboard, or on the VPS in a `.env` or systemd/env file, or in your deploy tool).
- Never commit production values; keep a secure, local list (e.g. password manager or encrypted note).

### 3. Static assets and uploads

- This app uses Next.js and does not assume a separate object store by default. If you later add file uploads (e.g. to S3/R2 or Vultr Object Storage), document where they live and migrate:
  - Copy objects from old bucket to new bucket (or new region).
  - Update app config (e.g. `NEXT_PUBLIC_*` or server env) to point at the new bucket/URL.

### 4. DNS and domain

- When the new host is ready, point your domain’s A (or CNAME) record to the new server or new host’s URL.
- Reduce TTL beforehand (e.g. to 300) so the switch is quick; then switch; then raise TTL again if you like.

### 5. Cutover order (minimising downtime)

1. DB: If migrating DB, do dump/restore and verify schema; then switch `DATABASE_URL` on the new app.
2. Deploy app on new host with same env (except `DATABASE_URL` if it changed).
3. Smoke-test (login, key flows) on the new host’s URL.
4. Switch DNS to the new host.
5. After propagation, leave the old host running briefly so stragglers complete; then decommission.

### 6. Rollback

- Keep the old host and DB (or DB backup) available for at least a few days. If something goes wrong, point DNS back and revert `DATABASE_URL` if you changed it.

---

## References

- **Deployment.md** – Current Vercel + Supabase setup and env vars.
- **Vultr:** [vultr.com](https://www.vultr.com) – Sydney: **Sydney**, Auckland: **Auckland**.
- **Drizzle / DB:** `bun run db:push` (schema sync); use `pg_dump` / `psql` for full dump/restore when moving DBs.
