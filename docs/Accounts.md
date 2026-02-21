# Accounts and authentication — portable spec

Use this as a single reference to add **login, sign up, verification, profile edit, and image handling** to a project that doesn’t yet have authentication or accounts. Stack assumed: **Next.js (App Router)**, **Supabase (Auth + Storage)**. Adjust provider names and routes to match your app.

---

## Routes

| Route              | Purpose                                                                                                                       |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `/login`           | Log in (email/password + OAuth). Redirect to profile or home if already logged in.                                            |
| `/signup`          | Sign up (email/password + OAuth). Redirect if already logged in.                                                              |
| `/account/edit`    | Edit own profile (auth required). Redirect to `/login` if not logged in.                                                      |
| `/user/<username>` | Public profile: avatar, name, title, bio, public content (e.g. recipes).                                                      |
| `/me`              | Redirect: if logged in → `/user/<username>`, else → home. Use after client-side login so the server can resolve the username. |

---

## Log in and sign up

- **UI:** Single form component used on both `/login` and `/signup` with a **default tab** (login vs sign up). Tabs or toggle to switch between “Log in” and “Sign up”.
- **Email/password:** Supabase `signInWithPassword` and `signUp` (with `emailRedirectTo` for verification). Show errors from Supabase in the form.
- **OAuth:** Google, Apple, Facebook (or subset) via Supabase Auth providers. Configure providers in Supabase Dashboard; use `signInWithOAuth` and redirect/callback URL (e.g. `/auth/callback`).
- **Verification:** Email sign up: Supabase sends confirmation; user clicks link and lands on your callback. OAuth: provider handles verification. In app, treat “confirmed” users as logged in; optional “Resend verification” link if you store email verification state.
- **Already logged in:** On load of `/login` or `/signup`, if `supabase.auth.getUser()` returns a user, redirect to `/user/<username>` (fetch username from `profiles`) or home. Optionally redirect from home to profile when logged in.

---

## Profile edit (account)

- **Route:** `/account/edit`. Server: load current user and profile (username, display name, first/last name, title, bio, avatar_url, etc.). Redirect to `/login` if no user.
- **Form fields:** Email (auth), username (unique, used for `/user/<username>`), display name, first name, last name, fun title, bio, profile picture (upload only; no “paste URL” if you want upload-only).
- **Profile picture (avatar):**
    - **Client:** File input → open **crop modal** (1:1 aspect; user drags/zooms image to choose area). Show **preview** (e.g. circular) of how it will look. On confirm, keep file and crop data (e.g. `{ x, y, width, height }` in pixels). Submit form with `avatar` (file) and `avatarCrop` (JSON string).
    - **Server:** If `avatar` and `avatarCrop` present, run **Sharp**: crop to that region, resize (e.g. 400×400), compress as JPEG, upload to **avatars** bucket, save returned public URL to `profiles.avatar_url`. If no crop, optional: upload file as-is or reject.
- **Default when no avatar:** Show an **SVG icon** (e.g. person or person-with-chef-hat) inside a circle so the layout is consistent.
- **Submit:** One “Save changes” button. Use **pending state** (spinner, disable button) to avoid double submit. On success: redirect to `/user/<username>`; revalidate that path and `/account/edit`.

---

## Thumbnail editing (e.g. recipe cover image)

- **Client:** User selects image → open **crop modal** with **fixed aspect ratio** (e.g. 16:9). User drags/zooms image; show **variation previews** (e.g. “In lists” small, “On page” larger) so they see how it will look. On confirm, keep file and crop data. Submit with `thumbnail` (file) and `thumbnailCrop` (JSON).
- **Server:** If both present, **Sharp**: crop to that region, resize (e.g. max width 1200px), compress as JPEG, upload to **recipe-media** (or your bucket), save URL to recipe row. Same pattern as avatar: crop data in pixels; Sharp `extract()` then `resize()` then `jpeg()` then upload.
- **Submit button:** “Save recipe” or “Save changes” with **spinner** and **disabled** while submitting.

---

## Top-right profile image and menu

- **State:** In root layout (server), load current user and profile (at least `username`, `avatar_url`). Pass to header. **Public:** avatar and menu are derived from this; no separate “profile” route for “my profile” — use `/user/<username>`.
- **UI:** When **logged out:** show **SVG icon** (person/chef); click opens menu: **Log in** → `/login`, **Sign up** → `/signup`. When **logged in:** show **avatar** (or same SVG if no `avatar_url`); click opens menu: **View profile** → `/user/<username>`, **Edit account** → `/account/edit`, **Log out** (call `signOut()`, then redirect/refresh).
- **Click actions:** One control (icon/avatar); one menu. No extra triggers. Use a dropdown/menu component (e.g. Mantine `Menu`).

---

## Node.js / front-end libraries

- **Sharp** (Node, server-only): Crop, resize, compress images. Use in **server actions** that receive the file and crop JSON; output buffer upload to Supabase Storage. Do not import Sharp in client components.
- **react-easy-crop**: Client-side crop UI. Fixed-aspect frame; user drags and zooms the image; you get `croppedAreaPixels` (and optionally a blob for preview). Send crop as JSON with the form; server applies same crop with Sharp.
- **getCroppedImg-style helper** (client): Given image URL and pixel crop, draw to canvas and return a blob for **previews** only. Server does the real crop from original file + crop data.

---

## Public state and actions (summary)

- **Server:** Auth (Supabase), profile load in layout and on `/account/edit`, `/user/<username>`. **Actions:** `updateProfile` (profile edit), recipe create/update (with thumbnail crop). Actions read FormData (file + crop JSON), run Sharp when crop present, upload to Storage, update DB, redirect/revalidate.
- **Client:** Form state (inputs, submitting, errors), crop modal (react-easy-crop), previews (blob from getCroppedImg), menu open/close, redirect after login (e.g. to `/me`). No auth secrets or API keys in client; only Supabase anon key and redirect URLs.

---

## Storage buckets and RLS

- **avatars:** Public read; authenticated insert/update/delete only for objects under `auth.uid()` (e.g. path `{user_id}/avatar.jpg`). File size limit (e.g. 2MB); allowed types: image/jpeg, image/png, image/gif, image/webp.
- **recipe-media** (or equivalent): Public read; authenticated insert/update/delete; path e.g. `{user_id}/{uuid}.jpg`. Limit and MIME types as needed.
- Create buckets via Supabase Dashboard (hosted) or via `config.toml` (local). RLS policies via SQL migrations.

---

## SVG icon default

- Provide a default **person** or **person-with-chef-hat** SVG component. Use it wherever an avatar is shown but `avatar_url` is null: header menu trigger, profile page, edit preview before upload. Keeps layout and accessibility consistent (e.g. `aria-label` on the button).

---

## Quick checklist for adding to another project

1. Supabase: Auth providers (email + Google/Apple/Facebook), callback URL, Storage buckets + RLS.
2. Routes: `/login`, `/signup`, `/account/edit`, `/user/<username>`, `/me`.
3. Layout: Load user + profile (username, avatar_url); header with profile control (icon/avatar + menu).
4. Login/signup form: Email/password + OAuth; redirect when already logged in; after login redirect to `/me`.
5. Profile edit page: All fields; avatar upload with crop modal (1:1); Sharp on server; Submit with spinner and no double submit.
6. Thumbnail (if applicable): Crop modal (fixed aspect) + variation previews; Sharp on server; same submit UX.
7. Default SVG icon for missing avatar.
8. Server actions: updateProfile, recipe create/update; accept file + optional crop JSON; use Sharp when crop present.

This file is the single reference; copy or adapt it into the other project’s docs or spec.
