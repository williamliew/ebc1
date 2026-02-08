# Status API and safe caching (Scenario C)

`GET /api/status` returns combined home status: vote open?, suggestions open?, current book. It is designed to work with **end times** for vote and suggestion rounds so that caching never shows "open" after a round has closed.

## Requirement

- Vote rounds have `close_vote_at`; when that time has passed, the vote must not appear as open.
- Suggestion rounds have `close_at`; when that time has passed, suggestions must not appear as open.

## How it works

1. The API computes the real-time status (vote open?, suggestions open?, current book) from the database.
2. It then computes **validUntil**: the earliest moment at which any "open" status could change:
   - If vote is open and `closeVoteAt` is set → `validUntil` is at most `closeVoteAt`.
   - If suggestions are open and `closeAt` is set → `validUntil` is at most `closeAt`.
   - An upper cap (e.g. 5 minutes) is applied so we don’t send a very large `max-age` when the close time is far in the future.
3. **Cache-Control** is set to `max-age = min(seconds until validUntil, 300)`.
   - Browsers and CDNs will not use the response after that time, so we never serve "vote open" or "suggestions open" past their end times.
4. If both vote and suggestions are closed (or there are no rounds), we can cache longer (up to the cap), since the next change is when an admin opens a new round.

## Result

- **Safe**: A cached response is never used after a round’s close time, so we never show an open vote or open suggestions when they should be closed.
- **One request**: The homepage can call a single `/api/status` instead of three separate checks.
- **Cache-friendly**: While a round is open, `max-age` is at most until its end time (or 5 minutes); once closed, the response can be cached for up to 5 minutes.
