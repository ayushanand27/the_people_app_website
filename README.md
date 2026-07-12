# The People App — Detailed Technical README

This document explains why the app was created, what was implemented, how it works (end-to-end), and all technical details you need to run, extend, test and deploy the project.

## Quick summary / motivation

The People App was built to create a lightweight, privacy-forward social discovery experience focused on shared interests and local communities. The main goals:

- Help people find like-minded local groups, events and individuals
- Make messaging, profile discovery, and lightweight media (moments) first-class
- Ship quickly using serverless/backed-by-BaaS tools (Supabase + Cloudinary) and a small React codebase
- Provide clear client-side logic that can be extended or converted to a server-backed API later

If you (the author) want to include a personal motivation note, add a short paragraph here about product choices, experiments, or lessons learned.

## Features implemented (detailed)

- Authentication: Email/password and Google OAuth (via Supabase)
- Onboarding flow: collect name, username, city, interests (3–5)
- Profiles: view, edit, avatar uploads (Supabase Storage)
- Discovery: **browse-city people first**, then other cities (cross-city messaging); filter by interest and search
- Groups: join/leave, list members (Admin CRUD for groups)
- Events: RSVP/cancel, list upcoming/all (Admin CRUD)
- Chat: 1:1 messaging + **image attachments** + Supabase realtime; works across cities
- Local listings: verified shops/services by city
- Moments: vertical videos (Cloudinary), likes/comments/bookmarks
- Settings: profile edit, delete account, privacy/terms
- Admin panel: groups/events/listings/reports
- Optional AI helper: `src/lib/ai.js` (icebreakers / moderation via edge functions)

## Live URL

- Production: https://the-people-app-website.vercel.app/

## Architecture & high-level flow

- Frontend: React + Vite. Pages live under `src/pages`, reusable components in `src/components`.
- Backend: Client uses Supabase directly — no custom server in this project. The client calls PostgREST endpoints, Storage and Realtime via `@supabase/supabase-js`.
- Realtime: Supabase Realtime (Postgres changes) provides live message updates and unread notifications.
- Storage/Media: Avatars in `avatars`; chat images in `chat-images`; listing images in `listing-images`. Moments videos use Cloudinary (signed uploads via edge function).

## Where to look in the code

- `src/lib/supabase.js` — Supabase client factory (reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`)
- `src/lib/ai.js` — small helper to generate icebreakers using OpenAI
- `src/App.jsx` — top-level router and auth/profile bootstrap
- `src/components/Navbar.jsx` — navigation and realtime unread counter
- `src/pages/Auth.jsx` — login/signup and OAuth
- `src/pages/Onboarding.jsx` — profile creation
- `src/pages/Discover.jsx` — search and match scoring
- `src/pages/Groups.jsx`, `src/pages/Events.jsx` — group & event flows
- `src/pages/Chat.jsx` — messaging UI with realtime subscription
- `src/pages/Moments.jsx` — video feed & Cloudinary upload
- `src/pages/Settings.jsx` — profile updates and avatar uploads
- `src/pages/Admin.jsx` — admin CRUD for groups/events/users

## Database schema (inferred)

Create these tables in Supabase (or adapt):

- profiles
  - id (uuid, PK)
  - full_name, username, bio, city
  - interests (text[] or jsonb)
  - avatar_url, onboarding_complete (bool), is_premium (bool)
  - created_at, updated_at

- messages
  - id, sender_id, receiver_id, content, image_url, read (bool), created_at
  - Chat is **not** city-scoped — any two authenticated users can message (unless blocked)
  - Images stored in Storage bucket `chat-images` under `{user_id}/...`

- groups
  - id, name, description, city, interests (text[]), max_members, created_by, created_at

- group_members
  - id, group_id, user_id

- events
  - id, title, description, city, date (timestamp), location, max_attendees, created_by

- event_attendees
  - id, event_id, user_id

- videos
  - id, user_id, title, description, video_url, thumbnail_url, duration, likes, created_at

- video_likes
  - id, video_id, user_id

Notes: many queries rely on `postgrest` aggregated counts: e.g. `.select('*, event_attendees(count)')` to get attendee counts.

## Supabase calls & client-side endpoints (what the code does)

- Authentication
  - `supabase.auth.signUp({ email, password })`
  - `supabase.auth.signInWithPassword({ email, password })`
  - `supabase.auth.signInWithOAuth({ provider: 'google' })`
  - `supabase.auth.signOut()`
- Profiles
  - Fetch profile: `supabase.from('profiles').select('*').eq('id', userId).single()`
  - Update: `supabase.from('profiles').update(...).eq('id', profile.id)`
- Messaging & realtime
  - Insert: `supabase.from('messages').insert({ sender_id, receiver_id, content, image_url })`
  - Query conversation: complex `.or()` filters using `and(...)` (see `src/pages/Chat.jsx`)
  - Realtime subscribe: `supabase.channel('msgs-${id}').on('postgres_changes', {event:'INSERT', table:'messages'}, handler)`
  - Chat images: `.storage.from('chat-images').upload(path, file)` then `getPublicUrl`
- Groups & group_members
  - `.from('groups').select('*, group_members(count)')`
  - join: `.from('group_members').insert({ group_id, user_id })`
- Events & event_attendees
  - `.from('events').select('*, event_attendees(count)')`
  - rsvp: `.from('event_attendees').insert({ event_id, user_id })`
- Moments (videos)
  - list with author: `.from('videos').select('*, profiles(full_name, username, avatar_url)')`
  - insert after upload: `.insert({ user_id, title, video_url, thumbnail_url, duration })`
- Storage
  - Avatars: `.storage.from('avatars').upload(path, file, { upsert: true })`
  - Chat images: `.storage.from('chat-images').upload(`${userId}/${ts}.ext`, file)`
  - Public URL: `.storage.from(...).getPublicUrl(path)`

Because the app is client-first, ensure Row Level Security (RLS) policies on Supabase tables for production.

## Realtime channels (used)

- `msgs` — used in `Chat.jsx` to receive new message INSERT events and append them to the conversation
- `unread` — used in `Navbar.jsx` to increment unread badge when a new message for the current user arrives

## Upload flows (how avatars & videos work)

- Avatar upload (`src/pages/Settings.jsx`):
  - Browser → Supabase Storage `avatars` via `upload(filePath, file)` → `getPublicUrl()` → saved to `profiles.avatar_url`.

- Video (Moments) upload (`src/pages/Moments.jsx`):
  - Browser → Cloudinary unsigned upload (`VITE_CLOUDINARY_CLOUD_NAME` + `VITE_CLOUDINARY_UPLOAD_PRESET`) → Cloudinary returns `secure_url` → insert row into `videos` table with `video_url` and `thumbnail_url`.

Security note: Cloudinary unsigned uploads are convenient for demos but not ideal for production — use signed uploads or proxy via a server.

## AI helper

- `src/lib/ai.js` exports `generateIcebreaker(context)` which calls OpenAI's Chat Completion endpoint (`model: 'gpt-4o-mini'`) with a lightweight system/user prompt. If `VITE_OPENAI_API_KEY` is missing the function returns a safe fallback string.

Important: Do not expose OpenAI keys from the browser. Move AI calls to a server for production.

## Environment variables (exact keys used in code)

- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY
- VITE_OPENAI_API_KEY (optional)
- VITE_CLOUDINARY_CLOUD_NAME (optional — for moments)
- VITE_CLOUDINARY_UPLOAD_PRESET (optional — for moments)

Create a `.env` at the project root (Vite requires `VITE_` prefix for client exposure). Example `.env.example` content:

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_OPENAI_API_KEY=
VITE_CLOUDINARY_CLOUD_NAME=
VITE_CLOUDINARY_UPLOAD_PRESET=
```

## How to run (local dev)

1. Install dependencies

```bash
npm install
```

2. Copy `.env.example` → `.env` and fill values

3. Start dev server

```bash
npm run dev
```

4. Open the app in your browser (Vite's default port is 5173)

## Deployment

- This project is ready for Vercel (includes `vercel.json`). Steps:
  1. Push repo to Git provider
  2. Create project on Vercel and import the repo
  3. Add environment variables in Vercel project settings
  4. Deploy — Vercel will run the build command

Live deployment (production)

You can link directly to the live site from your GitHub README. Current Vercel deployment URLs for this project:

- https://the-prople-app-website-git-main-ayushanand27s-projects.vercel.app
- https://the-prople-app-website-e06ff4q4c-ayushanand27s-projects.vercel.app

Tip: pick one canonical domain (the first link above is likely the most recent production URL) and add it to your repository description so visitors can find it easily.

## Security & production hardening

- Enable Row Level Security (RLS) on all tables and write minimal policies allowing only intended actions (e.g., update own profile).
- Move secret-requiring features (OpenAI calls, signed Cloudinary uploads) to serverless functions.
- Validate and sanitize user input server-side if you add a backend.

## Testing recommendations

- Unit tests: Jest + React Testing Library
- E2E: Playwright or Cypress for flows (signup → onboarding → upload → chat)
- Add smoke tests for RLS policies using a script or CI step to verify privileges

## Troubleshooting (common issues & fixes)

- Auth not working: verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` match your Supabase project and auth settings (email templates, redirect URLs for OAuth).
- Avatar upload failing: confirm `avatars` storage bucket exists and your storage policy allows uploads; check file size and content-type.
- Cloudinary upload fails: verify `VITE_CLOUDINARY_CLOUD_NAME` and `VITE_CLOUDINARY_UPLOAD_PRESET` (unsigned) are correct.
- Realtime events don't appear: check network console, browser blocks, or Supabase realtime add-on settings.

## Contribution & next steps I can do for you

- If you want, I can:
  - create `.env.example` in the repo
  - add `CONTRIBUTING.md` and `LICENSE` files
  - scaffold basic Jest tests and a GitHub Actions CI workflow
  - move AI calls to a Supabase Function or Vercel serverless endpoint

---

If you want a tailored README section (e.g., a full DB migration SQL, RLS policy examples, or a diagram), tell me which and I will add it below or produce SQL/policy files and `.env.example` automatically.
