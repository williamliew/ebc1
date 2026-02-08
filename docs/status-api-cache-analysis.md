# Status API cache: verification and real-time behaviour

## 1. Does the scenario work as is?

**Yes.** The current implementation is correct and safe.

| Direction | Behaviour | Cache effect |
|-----------|-----------|--------------|
| **Open → closed** (round ends) | `validUntil` is set to the round’s `closeVoteAt` / `closeAt`. `max-age` is at most the time until that moment (capped at 5 min). So the response is **never** used after the round has closed. Public users never see “vote open” or “suggestions open” past the end time. | **Safe and reflective.** |
| **Both closed** (no open rounds) | No end time is used; `validUntil = now + 5 min`, so `max-age` is 300. “Closed” is cached for up to 5 minutes. | **Efficient.** |

So the cache is **truly reflective** of round end times and **efficient** (we cache when closed and until end time when open).

---

## 2. When admin adds a vote or opens a suggestion round, do public users see it in real time?

**Not guaranteed.** There is a delay when the **previous** state was “closed”.

- While the last response was “vote closed” / “suggestions closed”, that response was sent with `max-age=300` (5 minutes).
- Browsers (and any CDN using the response) will reuse that cached response until it expires.
- So after an admin **opens** a new vote or suggestion round, users who already have a cached “closed” response will continue to see “closed” until their cache expires — **up to 5 minutes**.
- New users (or users whose cache has expired) will get a fresh response and see the new round immediately.

So:

- **Real time when something closes:** Yes — we never cache past the end time, so “open” is not shown after close.
- **Real time when admin opens something:** No — “closed” can be cached for up to 5 minutes, so the new round can appear with a delay of up to 5 minutes for users holding that cached response.

---

## 3. Summary

| Requirement | Met? |
|-------------|------|
| Never show “open” after round end time | Yes |
| Cache is efficient (use end times when open, short cache when closed) | Yes |
| Public users see new rounds as soon as admin opens them | No — up to 5 min delay when previous state was “closed” |

To make “admin opens round” feel real time you’d need to either:

- Shorten the cache when the state is “closed” (e.g. `max-age=60` when both are closed), so new rounds appear within ~1 minute, or
- Avoid caching when closed (`max-age=0`), at the cost of more requests, or
- Accept the current trade-off: up to 5 minutes delay when opening a round, in exchange for fewer requests when nothing is open.

No code changes were made; this is a verification-only analysis.
