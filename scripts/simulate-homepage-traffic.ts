/**
 * Simulates ~100 users visiting the book club app under three homepage strategies:
 *
 * A) Click-through: Home shows 3 buttons only. Users click through → each route does its own fetch.
 *
 * B) Status on home (3 fetches): Home does 3 separate status checks. Fewer clicks.
 *
 * C) Status on home (1 combined API + safe cache): Home calls GET /api/status once. Cache-Control
 *    is set from vote/suggestion round end times so we never serve "open" past close time.
 *    See docs/status-api-caching.md.
 *
 * Run: npx tsx scripts/simulate-homepage-traffic.ts
 */

const NUM_USERS = 100;

// Realistic click-through rates (per user, independent): % who click each link
// Many users click "Our current book"; fewer click Vote or Suggest in a given visit.
const CLICK_RATE_VOTE = 0.35;
const CLICK_RATE_SUGGEST = 0.25;
const CLICK_RATE_NEXTBOOK = 0.5;

// When status is shown on home, some of those clicks were "just checking" and are saved
const FRACTION_CLICKS_SAVED_BY_STATUS = 0.5;

// Cost model (per request)
const HOME_AUTH_ONLY = 1; // home does 1 server-side check (auth)
const VOTE_PAGE_REQUESTS = 1; // page load
const VOTE_API_CALLS = 1; // GET /api/votes
const SUGGEST_PAGE_REQUESTS = 1;
const SUGGEST_API_CALLS = 2; // suggestion-rounds + suggestions (or 1 then 1 on demand)
const NEXTBOOK_PAGE_REQUESTS = 1; // RSC with getNextBook() inside = 1 invocation + 1 DB read

// Scenario B: 3 separate fetches per home load
const HOME_STATUS_FETCHES = 3;
// Scenario C: 1 combined GET /api/status (same data, one invocation + one set of DB reads)
const HOME_STATUS_COMBINED_FETCHES = 1;

function runSimulation() {
    console.log('=== Book club traffic simulation ===\n');
    console.log(`Users: ${NUM_USERS}`);
    console.log(
        `Click rates (per user): Vote ${CLICK_RATE_VOTE * 100}%, Suggest ${CLICK_RATE_SUGGEST * 100}%, Our current book ${CLICK_RATE_NEXTBOOK * 100}%\n`,
    );

    // --- Scenario A: Click-through (current) ---
    const aHomeRequests = NUM_USERS;
    let aVoteClicks = 0;
    let aSuggestClicks = 0;
    let aNextbookClicks = 0;

    for (let i = 0; i < NUM_USERS; i++) {
        if (Math.random() < CLICK_RATE_VOTE) aVoteClicks++;
        if (Math.random() < CLICK_RATE_SUGGEST) aSuggestClicks++;
        if (Math.random() < CLICK_RATE_NEXTBOOK) aNextbookClicks++;
    }

    const aVoteRequests = aVoteClicks * (VOTE_PAGE_REQUESTS + VOTE_API_CALLS);
    const aSuggestRequests =
        aSuggestClicks * (SUGGEST_PAGE_REQUESTS + SUGGEST_API_CALLS);
    const aNextbookRequests = aNextbookClicks * NEXTBOOK_PAGE_REQUESTS;

    const aTotalPageLoads =
        aHomeRequests + aVoteClicks + aSuggestClicks + aNextbookClicks;
    const aTotalInvocations =
        aHomeRequests +
        aVoteClicks * (1 + 1) +
        aSuggestClicks * (1 + 2) +
        aNextbookClicks;
    const aTotalDataFetches =
        aHomeRequests * HOME_AUTH_ONLY +
        aVoteClicks * VOTE_API_CALLS +
        aSuggestClicks * SUGGEST_API_CALLS +
        aNextbookClicks * 1; // getNextBook per nextbook page

    console.log('--- Scenario A: Click-through (current) ---');
    console.log(`  Home page loads:     ${aHomeRequests}`);
    console.log(`  Vote clicks:         ${aVoteClicks} → ${aVoteRequests} requests`);
    console.log(`  Suggest clicks:      ${aSuggestClicks} → ${aSuggestRequests} requests`);
    console.log(`  Our current book:    ${aNextbookClicks} → ${aNextbookRequests} requests`);
    console.log(`  Total page loads:    ${aTotalPageLoads}`);
    console.log(`  Total invocations:   ${aTotalInvocations} (page + API)`);
    console.log(`  Total data fetches:  ${aTotalDataFetches} (auth + API/DB)\n`);

    // --- Scenario B: Status on home (fewer clicks) ---
    const bHomeRequests = NUM_USERS;
    const bVoteClicks = Math.round(aVoteClicks * (1 - FRACTION_CLICKS_SAVED_BY_STATUS));
    const bSuggestClicks = Math.round(
        aSuggestClicks * (1 - FRACTION_CLICKS_SAVED_BY_STATUS),
    );
    const bNextbookClicks = Math.round(
        aNextbookClicks * (1 - FRACTION_CLICKS_SAVED_BY_STATUS),
    );

    const bTotalPageLoads =
        bHomeRequests + bVoteClicks + bSuggestClicks + bNextbookClicks;
    const bTotalInvocations =
        bHomeRequests +
        bVoteClicks * 2 +
        bSuggestClicks * 3 +
        bNextbookClicks;
    // Home now does 1 auth + 3 status fetches per load
    const bTotalDataFetches =
        bHomeRequests * (HOME_AUTH_ONLY + HOME_STATUS_FETCHES) +
        bVoteClicks * VOTE_API_CALLS +
        bSuggestClicks * SUGGEST_API_CALLS +
        bNextbookClicks * 1;

    const clicksSaved =
        aVoteClicks -
        bVoteClicks +
        (aSuggestClicks - bSuggestClicks) +
        (aNextbookClicks - bNextbookClicks);

    console.log('--- Scenario B: Status on home (fewer clicks) ---');
    console.log(
        `  Assumption: ${FRACTION_CLICKS_SAVED_BY_STATUS * 100}% of clicks were "just checking" and are saved`,
    );
    console.log(`  Home page loads:     ${bHomeRequests} (each does auth + 3 status fetches)`);
    console.log(`  Vote clicks:         ${bVoteClicks}`);
    console.log(`  Suggest clicks:      ${bSuggestClicks}`);
    console.log(`  Our current book:    ${bNextbookClicks}`);
    console.log(`  Total page loads:    ${bTotalPageLoads}`);
    console.log(`  Total invocations:   ${bTotalInvocations}`);
    console.log(`  Total data fetches:  ${bTotalDataFetches}`);
    console.log(`  Clicks saved:         ${clicksSaved}\n`);

    // --- Comparison ---
    console.log('--- Comparison (B vs A) ---');
    console.log(
        `  Invocations:  ${bTotalInvocations} vs ${aTotalInvocations} (${bTotalInvocations <= aTotalInvocations ? 'fewer' : 'more'} with status on home)`,
    );
    console.log(
        `  Data fetches: ${bTotalDataFetches} vs ${aTotalDataFetches} (${bTotalDataFetches <= aTotalDataFetches ? 'fewer' : 'more'} with status on home)`,
    );
    console.log(`  Clicks saved: ${clicksSaved} (better UX)\n`);

    console.log('--- Free tier takeaway ---');
    if (bTotalDataFetches > aTotalDataFetches) {
        console.log(
            `  Status on home increases total data fetches (${bTotalDataFetches} vs ${aTotalDataFetches}) but saves ${clicksSaved} clicks.`,
        );
        console.log(
            '  If your free tier limits DB/API calls, click-through (A) is lighter.',
        );
    } else {
        console.log(
            `  Status on home reduces data fetches and saves ${clicksSaved} clicks.`,
        );
    }
    if (bTotalInvocations < aTotalInvocations) {
        console.log(
            `  Fewer total invocations with status on home (${bTotalInvocations} vs ${aTotalInvocations}) — good for invocation-limited tiers.`,
        );
    }

    // --- Scenario C: One combined status API (safe cache respects round end times) ---
    const cTotalDataFetches =
        bHomeRequests * (HOME_AUTH_ONLY + HOME_STATUS_COMBINED_FETCHES) +
        bVoteClicks * VOTE_API_CALLS +
        bSuggestClicks * SUGGEST_API_CALLS +
        bNextbookClicks * 1;
    const cTotalInvocations =
        bHomeRequests +
        bVoteClicks * 2 +
        bSuggestClicks * 3 +
        bNextbookClicks;

    console.log('--- Scenario C: Combined status API (safe cache) ---');
    console.log(
        '  Home calls GET /api/status once. Cache-Control max-age is derived from',
    );
    console.log(
        '  vote closeVoteAt and suggestion closeAt so "open" is never cached past end time.',
    );
    console.log(`  Total data fetches:  ${cTotalDataFetches}`);
    console.log(`  Total invocations:   ${cTotalInvocations}`);
    console.log(
        `  vs A: ${cTotalDataFetches <= aTotalDataFetches ? 'fewer' : 'more'} fetches, ${cTotalInvocations <= aTotalInvocations ? 'fewer' : 'more'} invocations, ${clicksSaved} clicks saved.`,
    );
}

runSimulation();
