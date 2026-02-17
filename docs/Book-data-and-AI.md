# Book data and AI: reliability and options

Free book APIs (Open Library, etc.) often lack blurbs, covers, or even the book itself. This doc outlines **where AI can improve reliability**, where it cannot, and **free-to-affordable AI APIs** suitable for a book club app’s scale.

---

## Where AI can help (and where it cannot)

### Blurbs / descriptions — **yes, AI can help**

- **Flow:** Do a **reliable search first** (Open Library, any other APIs). If you get a blurb, use it. **Only if nothing is returned** do you call the LLM to fill the gap. No need to label the result “AI-generated” in the UI—just show it as the description.
- **Why that’s reasonable:** For many books, the model has been trained on real back-cover copy, publisher summaries, and reviews. So when it answers, it’s often **recalling or paraphrasing the real blurb**, not inventing one. For well-known titles the result can be as good as “the” blurb; for obscure ones it may be generic or wrong, so treat it as a fallback when APIs have nothing.
- **Implementation:** After all API lookups, if `blurb` is null/empty, call an LLM. In the prompt, **ask for the real blurb first**: if the model has the publisher or back-cover description in its training, it should return that. **Only if it doesn’t have the real blurb but has the book indexed** should it generate a short summary. See the Integration sketch below for prompt wording.

### Covers — **AI can help find the right edition**

- The LLM cannot return an image URL, but it **can** return a canonical title and author for the “most well-known English edition” (e.g. original or best-known release). The app then uses that to query **Longitood** (and existing cover APIs) so the cover image is more likely to match the familiar edition.
- **In this app:** On the review step, a **“Look for book cover with AI”** button calls Gemini to get the canonical title/author for the English, well-known/original cover, then fetches the cover URL from Longitood. The result is applied as the manual thumbnail override (or equivalent).

### Search / disambiguation — **optional**

- AI could help when search returns nothing or ambiguous results (e.g. “suggest an Open Library query for this title” or “which of these results matches ‘X’?”). Useful but more involved; prioritise **blurb fallback** first.

---

## Recommended AI APIs: free to affordable (book club scale)

Assume **low volume**: tens to a few hundred book lookups or blurb generations per month. No need for heavy enterprise pricing.

| Provider / route | Model / product | Free tier / cost | Notes |
|------------------|-----------------|-------------------|--------|
| **Google AI (Gemini)** | Gemini 1.5 Flash (or 2.0 Flash) | Free tier: rate limits (e.g. 15 rpm, 1.5K requests/day); generous for small apps | Good first choice: free, good quality for short blurbs. [ai.google.dev](https://ai.google.dev) |
| **Groq** | Llama 3.x (e.g. llama-3.3-70b) | Free tier with rate limits; very fast inference | Free for low volume; use for “generate blurb” when missing. [groq.com](https://groq.com) |
| **OpenAI** | GPT-4o mini | No free API; ~\$0.15/1M input, ~\$0.60/1M output | Very cheap at book club scale (hundreds of blurbs = cents). Reliable. |
| **Mistral** | Mistral Small / Large | Free tier (rate limited); pay-as-you-go after | [mistral.ai](https://mistral.ai) – simple API, EU-friendly. |
| **Anthropic** | Claude 3 Haiku | Limited free tier; Haiku is low-cost per token | Good quality; use when you want Claude and can accept some cost. |
| **OpenRouter** | Many models (Llama, Mistral, GPT, etc.) | Some models free; others pay per token; single API | Use if you want to **switch models** without changing code. [openrouter.ai](https://openrouter.ai) |

**Practical order to try**

1. **Google AI (Gemini)** – free tier is usually enough for “blurb when missing”; add an API key in project settings (do not commit it; use env vars).
2. **Groq** – free, fast; good backup or primary for blurb generation.
3. **OpenAI (GPT-4o mini)** – when you’re happy to pay a little for maximum reliability and don’t want to worry about rate limits.

---

## Integration sketch (blurb fallback only)

- **Where:** In the code path that builds book details for the UI (e.g. after `getOpenLibraryBooksDetails` and any cover fallback in `api/nomination/route.ts`, or in `api/books/search/route.ts` when you want to enrich results).
- **When:** Only when `blurb` is null or empty after all API lookups.
- **Prompt:** Tell the model to prefer the real blurb, then generate only if needed. For example:  
  “For the book ‘{title}’ by {author}: if you have the publisher or back-cover description (or something very close), provide it. If you don’t have that but know the book, give a 2–3 sentence neutral plot summary with no spoilers. If you’re not sure about the book, say so and give nothing.”  
  So when calling the LLM we still **search for the real blurb first** (via the prompt); only if the model doesn’t have it but has the book do we get a generated summary.
- **Safety:** Validate response length; strip any “I don’t have…” preamble and treat as “no blurb” if the model declines. No need to label the description in the UI—treat it like any other blurb.
- **Secrets:** Put the API key in an env var (e.g. `GOOGLE_AI_API_KEY` or `OPENAI_API_KEY`). Never commit keys; see **Deployment.md** / **Hosting.md** for production env handling.

---

## How it works in this app

The app uses **Google Gemini** (env: `GEMINI_API_KEY` or `GOOGLE_API_KEY`) in three places: **Suggest next book** (`/suggestnextbook`), **Create a vote** (`/admin/create-a-vote`), and **Book of the month** (`/admin/bookofthemonth`).

### Blurb (description)

1. **Search first:** Open Library is used for book search and initial description.
2. **At review:** When the user is on the review step for a selected book:
   - If the description is **empty**, the app **automatically** calls the blurb-from-AI API (real blurb first, then generated if needed) and shows **“Description (found or generated by AI)”**.
   - If the description is **already present**, the app shows **“Description”** and a button **“This description doesn’t look right. Try find with AI”**. When clicked, the app replaces the description with the AI result and switches the label to **“Description (found or generated by AI)”** and removes the button.
3. **Admin pages** (create-a-vote, bookofthemonth): The same logic runs inside the **TipTap (BlurbEditor)** component so the admin can edit the text whether it came from Open Library or Gemini.

### Cover

- A **“Look for book cover with AI”** button appears on the review step (all three flows). When clicked, the app asks Gemini for the **canonical title and author** for the most well-known **English** edition (e.g. original or best-known cover), then uses that to fetch a cover URL from **Longitood**. The returned URL is set as the manual thumbnail override.

### API routes and security

- **`POST /api/books/blurb-from-ai`** — body: `{ title, author }`; returns `{ blurb, source }`. Rate-limited; server-only (uses env key).
- **`POST /api/books/cover-from-ai`** — body: `{ title, author }`; returns `{ coverUrl }`. Rate-limited; server-only.
- The Gemini API key is **never** sent to the client; all calls are made from the Next.js server.

---

## Summary

| Data | More reliable with AI? | Approach |
|------|------------------------|----------|
| **Blurb** | Yes, as fallback | Search APIs first; at review, if no blurb auto-fetch from Gemini (real first, then generated); if blurb exists, optional “Try find with AI” button. Label: “Description (found or generated by AI)” when from AI. |
| **Cover** | Yes, for edition | “Look for book cover with AI” uses Gemini to get canonical English title/author, then Longitood for the image URL. |
| **Search** | Optional | Use AI later for disambiguation if needed. |

Use **free tiers (Gemini, Groq)** first; move to **affordable paid (GPT-4o mini, Mistral)** if you hit limits or want higher consistency.
