# Gemini API setup (Google Console & AI Studio)

Step-by-step instructions to get a Gemini API key and project set up for the book-data blurb fallback. **This doc covers only the Google side.** App code changes (env vars, blurb fallback logic) will be done when you explicitly ask to move on to that.

---

## What you’ll end up with

- A **Google Cloud project** (used by Gemini API for quotas and billing).
- A **Gemini API key** tied to that project.
- Knowledge of where to see **rate limits** and **usage** (per project).

You’ll store the API key in the app’s environment later; do **not** commit it to the repo.

---

## Step 1: Sign in to Google AI Studio

1. Open **[Google AI Studio](https://aistudio.google.com)** in your browser.
2. Sign in with the Google account you want to use for the book club app.
3. If prompted, accept the **Terms of Service** for the Gemini API.

---

## Step 2: Get or create a project

Rate limits are **per project**, not per account. You can use the default project or create/import one.

### Option A: Use the default project (simplest)

- If you’re new to Google AI Studio, a **default project** (and sometimes a default API key) may already exist after you accept the Terms.
- In the left sidebar, open **Dashboard** → **Projects**.
- If you see a project listed (e.g. “My First Project” or similar), you can use it. Note its name; you’ll create an API key in it in Step 3.

### Option B: Create a new project in AI Studio

- In the left sidebar: **Dashboard** → **Projects**.
- Click **Create project** (or **Import project** if you prefer to use an existing Google Cloud project).
- If **Create project** is available: give the project a name (e.g. “Bookclub” or “EBC Gemini”), then create it.
- If you only see **Import project**: you need to create the project in Google Cloud first (Step 2b below), then import it here.

### Option B (b): Create project in Google Cloud, then import into AI Studio

Use this if AI Studio doesn’t offer “Create project” or you want a dedicated Cloud project.

1. Open **[Google Cloud Console](https://console.cloud.google.com)** and sign in with the same Google account.
2. At the top left, click the **project dropdown** (it may say “Select a project” or show the current project name).
3. Click **New project**.
4. Enter a **Project name** (e.g. “Bookclub” or “EBC-Gemini”), optionally change the **Project ID**, then click **Create**.
5. Switch back to **[Google AI Studio](https://aistudio.google.com)**.
6. Go to **Dashboard** → **Projects** → **Import projects**.
7. Search for your new project by name or ID, select it, then click **Import**.

You now have a project visible in AI Studio. Remember which one you want to use for the book club app.

---

## Step 3: Create an API key

1. In Google AI Studio, open **Dashboard** (left sidebar) → **API Keys**.
   - Or go directly to: **[aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)**.
2. Select the **project** you’re using (dropdown or project list if shown).
3. Click **Create API key**.
   - You may be asked to pick a project first; choose the one from Step 2.
4. A new key is generated. Click **Copy** to copy it.
5. **Store the key somewhere safe and private** (e.g. password manager or a local file that is **not** in the repo and is in `.gitignore`). You will add it to the app as an environment variable when we do the app changes.

**Important:** Treat this key like a password. Do not commit it, and do not use it in client-side (browser) code. The app will call Gemini only from the server.

---

## Step 4: (Optional) Restrict the API key

To reduce risk if the key is ever leaked:

1. In **API Keys**, click the key you created (or the three dots → Edit).
2. Under **API restrictions**, restrict the key to **Generative Language API** only (or the specific Gemini APIs offered in the list).
3. Optionally add **Application restrictions** (e.g. IP addresses for your server) when you have a fixed deployment. For local dev you can leave this unrestricted and rely on not exposing the key.

Save changes. You can tighten restrictions later when you deploy.

---

## Step 5: Check rate limits and usage

- **Rate limits** (RPM, TPM, RPD) are **per project**, not per account. Each project has its own quota.
- To see your current limits and usage:
  1. In AI Studio, open **Dashboard** → **Usage** (or go to **[Usage in AI Studio](https://aistudio.google.com/usage)**).
  2. Select the **project** and the **time range** (e.g. last 7 or 28 days).
  3. Check the **Rate limit** tab for requests per minute/day and tokens per minute/day.

Free tier limits are listed on the [Gemini API rate limits](https://ai.google.dev/gemini-api/docs/rate-limits) page. If you need higher limits later, you can link a billing account and request an upgrade for that project.

---

## Step 6: Verify the key (optional)

You can confirm the key works with a single REST call (from your machine only; do not put the key in shared or client-side code):

```bash
# Replace YOUR_API_KEY with your actual key. Run in a terminal; do not commit this.
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=YOUR_API_KEY" \
  -H 'Content-Type: application/json' \
  -X POST \
  -d '{"contents": [{"parts": [{"text": "Reply with exactly: OK"}]}]}'
```

If the key and project are valid, you should get a JSON response with generated text (e.g. “OK”). Then delete the key from your shell history if you pasted it there.

---

## Summary checklist

- [ ] Signed in to [Google AI Studio](https://aistudio.google.com) with your Google account.
- [ ] Have a **project** (default or created/imported).
- [ ] **API key** created for that project and copied to a safe place.
- [ ] (Optional) Key restricted to Generative Language API.
- [ ] Know where to check **usage/rate limits**: AI Studio → Usage, per project.

**In the app:** The key is read from `GEMINI_API_KEY` or `GOOGLE_API_KEY` in `.env.local` (local) and in Vercel env vars (production). It is used for blurb and cover lookup on Suggest next book, Create a vote, and Book of the month. See **Book-data-and-AI.md** for how it works. Do not commit the API key.
