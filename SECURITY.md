# Security

This document summarises the security posture of the Elwood Book Club app and how we mitigate common risks.

## Current mitigations

### Input validation

- **API request bodies** are validated with Zod before use (votes, book search, nomination, suggestions, admin login, vote access password). Length and type limits are applied (e.g. `title`/`author` max 512, `voterKeyHash` max 256, suggestion `comment` max 4000 raw chars, 350 plain-text characters). Suggestion comments are additionally checked for safe-for-work language (server-side blocklist) and rejected if they contain blocklisted words.
- **Query parameters** used in DB or external calls are validated: `roundId` as integer, `date` as YYYY-MM-DD (nomination), `ids` as Open Library work keys (book details).

### Injection

- **Database:** All access goes through Drizzle with parameterised queries. No raw SQL built from user input; SQL injection is not possible from request data.
- **HTML / XSS:** User/API-controlled HTML is limited to (1) book blurbs and (2) suggestion comments. Blurbs are sanitised with `sanitiseBlurb()` (sanitize-html) with a fixed allowlist of tags and schemes (`http`, `https`, `mailto` only for links). Suggestion comments are sanitised with `sanitiseSuggestionComment()` (sanitize-html) allowing only `p`, `br`, `strong`, `em`, `b`, `i`, `u`, `span` (no links or script). Script injection via blurbs or comments is mitigated.
- **External APIs:** Open Library URLs are built from validated keys only; no `eval()` or dynamic code execution.

### Auth and secrets

- **Admin:** Signed cookie (HMAC with `ADMIN_PASSWORD`), HttpOnly, Secure in production, SameSite=Lax. No API keys or secrets in client bundles.
- **Vote access:** Per-round signed cookie; verification is constant-time comparison of the full cookie value.

### Logging

- Logs use `console.error`/`console.warn` for errors. No credentials, tokens, or PII are logged.

---

## Rate limiting

Sensitive endpoints use a best-effort, in-memory rate limiter (see `src/lib/rate-limit.ts`). Limits are per-IP (from `x-forwarded-for` or `x-real-ip`). In serverless environments (e.g. Vercel), each instance has its own store, so limits are best-effort under high concurrency. For stricter guarantees, use an external store (e.g. Upstash Redis) or Vercel Firewall.

Applied to:

- **Admin login** – 10 attempts per minute per IP.
- **Vote access password** – 10 attempts per minute per IP.
- **Book search** – 60 requests per minute per IP (admin and public use).
- **POST /api/votes** – 30 submissions per minute per IP.
- **POST /api/suggestions** – 20 submissions per minute per IP.

---

## Security headers

Set in `next.config.ts`:

- **X-Frame-Options: DENY** – Reduces clickjacking.
- **X-Content-Type-Options: nosniff** – Prevents MIME sniffing.
- **Referrer-Policy: strict-origin-when-cross-origin** – Limits referrer leakage.
- **Permissions-Policy** – Restricts browser features (camera, microphone, etc.) to none.

---

## Residual risks

| Area              | Status      | Note                                                     |
| ----------------- | ----------- | -------------------------------------------------------- |
| SQL injection     | Mitigated   | Drizzle parameterised queries only.                      |
| XSS (blurbs)      | Mitigated   | Sanitised allowlist; no script schemes.                  |
| XSS (comments)    | Mitigated   | Sanitised allowlist (bold/italic/underline only).        |
| Comment content   | Mitigated   | SFW blocklist; comments with blocklisted words rejected. |
| Input validation  | Mitigated   | Bodies and key query params validated.                   |
| Secrets in client | Mitigated   | No API keys in frontend.                                 |
| Rate limiting     | Best-effort | In-memory; use external store for strict limits.         |
| CSRF              | Partial     | SameSite cookies help; no CSRF tokens.                   |
| Brute force       | Reduced     | Rate limit on login and vote password.                   |

---

## Ideas for later (reminders)

- **Gemini / AI endpoints:** Tighter rate limits, or only allow blurb/cover/discussion-questions AI calls for authenticated users or specific flows, to reduce token burn from distributed abuse.
- **Rate limiting:** Use **Upstash** (or similar) for a shared rate-limit store so limits apply across all serverless instances, not just per instance.
- **CSRF:** Add CSRF tokens (or double-submit cookie) for mutating API routes; risk is currently moderate; adding auth and SameSite cookies later will help further.

---

## Reporting issues

If you find a security issue, please report it privately (e.g. to the repository owner) rather than opening a public issue.
