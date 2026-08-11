# The People App — Technical README

A privacy-forward social discovery app: find people, groups, events, and local businesses by shared interests and city, chat in real time, and share short vertical videos ("Moments").

For step-by-step deploy/setup instructions (Supabase dashboard config, Vercel env vars, edge function secrets), see [SETUP.md](SETUP.md). This document covers architecture, features, and how the code works.

## Live URL

- Production: https://the-people-app-website.vercel.app/

This is the canonical domain — it's what's configured as the Supabase Auth Site URL, so auth redirects (password reset, Google OAuth) only work correctly against this URL.

## Features implemented

- **Auth**: Email/password + Google OAuth via Supabase, with an onboarding gate and password-reset recovery flow
- **Onboarding & Profiles**: name, username, city, interests (3–5), avatar upload (Supabase Storage), edit/delete account
- **Discovery**: browse-city people first, then other cities; filter by interest, basic match scoring
- **Groups**: browse/join/leave (creation & editing is admin-only — see Security below)
- **Events**: browse/RSVP/cancel (creation & editing is admin-only)
- **Chat**: 1:1 realtime messaging, image attachments, cross-city; local keyword filter + AI text/image moderation before send; report/block; rate-limited to 10 new DM recipients/hour
- **Moments**: vertical video feed, signed Cloudinary uploads (server-validated size/duration), likes
- **Local**: verified business/listing marketplace with admin approval
- **Admin panel** (`/admin`, gated by `profiles.is_admin`): CRUD for groups/events/listings, user list, reports/moderation queue, bans
- **AI helper**: icebreaker generation + content moderation, proxied server-side through the `ai-proxy` Supabase Edge Function — no AI provider keys ever reach the browser
- **Moderation**: user blocking/reporting; blocked users are hidden from profiles, discover, and chat
- **PWA**: installable on mobile via `vite-plugin-pwa` (manifest + service worker, precaches only this app's own build output — never intercepts Supabase API/Realtime traffic)
- **Accessibility**: icon-only buttons across the app carry `aria-label`s for screen readers
- **SEO**: `robots.txt` + `sitemap.xml` for the public marketing routes (`/`, `/privacy`, `/terms`) — everything else is auth-gated and intentionally excluded from indexing

## Architecture

- **Frontend**: React 19 + Vite, react-router-dom 7, Tailwind 4. Pages in `src/pages`, shared components in `src/components`, business logic in `src/lib`.
- **Backend**: Supabase only — no custom server. The client talks to PostgREST, Storage, and Realtime directly via `@supabase/supabase-js`, protected by Postgres Row Level Security (RLS).
- **Edge Functions** (`supabase/functions/`, Deno/TypeScript) hold every real secret and are the only place secret-requiring work happens:
  - `ai-proxy` — Groq/OpenAI calls for icebreakers and content moderation
  - `cloudinary-sign` — signs video uploads server-side after validating size/duration
  - `delete-account` — permanently deletes a user's account and data
- **Database**: 22 SQL migrations in `supabase/migrations/` define schema, RLS policies, admin flags, rate limits, moderation state, and capacity triggers.
- **Media**: Avatars/chat/listing images in Supabase Storage; Moments videos via signed Cloudinary uploads.
- **Observability**: Sentry (errors, production only) + PostHog (analytics, production only, EU region).
- **Deployment**: Vercel, with CSP and security headers in `vercel.json`.

## Where to look in the code

- `src/lib/supabase.js` — Supabase client factory
- `src/lib/ai.js` — icebreaker + moderation calls to the `ai-proxy` edge function
- `src/lib/authRecovery.js` / `src/lib/authBootstrap.js` — password-reset/OAuth callback routing, run before the Supabase client parses the URL
- `src/lib/deleteAccount.js` — calls the `delete-account` edge function
- `src/lib/videoUpload.js` — client-side video validation + signed Cloudinary upload flow
- `src/App.jsx` — router, auth/profile bootstrap, onboarding gate
- `src/pages/Auth.jsx`, `src/pages/Onboarding.jsx` — signup/login/OAuth, profile creation
- `src/pages/Discover.jsx` — search and match scoring
- `src/pages/Groups.jsx`, `src/pages/Events.jsx` — browse/join/RSVP (read + membership only; creation is admin-only)
- `src/pages/Chat.jsx` — messaging UI with realtime subscription and moderation
- `src/pages/Moments.jsx` — video feed & upload
- `src/pages/Local.jsx`, `src/pages/LocalDetail.jsx` — business listings
- `src/pages/Settings.jsx` — profile updates, avatar upload, account deletion
- `src/pages/Admin.jsx` + `src/pages/admin/AdminListingsTab.jsx` + `src/pages/admin/AdminReportsTab.jsx` — admin panel

## Database & security model

Schema and RLS policies live in `supabase/migrations/` (apply in order; see SETUP.md for how to run them against a project). Highlights:

- RLS is enabled on every table; policies are scoped to `auth.uid()` and a `SECURITY DEFINER` `public.is_admin_user()` helper (avoids the RLS-recursion trap of querying `profiles` from within a `profiles` policy).
- **Admin-only writes**: `groups` and `events` can only be inserted/updated by admins (`public.is_admin_user()`), matching the fact that only the Admin panel UI creates them — regular users only read and manage their own `group_members`/`event_attendees` rows.
- Group/event capacity is enforced server-side via triggers (`20_enforce_capacity.sql`), not just client-side checks.
- Blocked users are filtered out at the RLS/query level, not just hidden in the UI (`18_block_hides_profiles.sql`).
- Chat has a server-enforced new-recipient rate limit (`17_chat_new_recipient_rate_limit.sql`).

Because the app is client-first, RLS is the actual security boundary — any policy gap is a real vulnerability, not just a UI bug. When adding a new table or write path, always ask "what INSERT/UPDATE/DELETE policy governs this, and does it match who the UI intends to allow?"

## Environment variables

See `.env.example` for the full list with descriptions. Client-side (`VITE_`-prefixed) variables are safe to expose in the browser bundle; anything without that prefix (`GROQ_API_KEY`, `OPENAI_API_KEY`, Cloudinary API secret) must only ever be set as a Supabase Edge Function secret — never in `.env` or Vercel env vars.

## How to run locally

```bash
npm install
cp .env.example .env   # then fill in values — see SETUP.md
npm run dev
```

## Testing & CI

- Unit tests: Vitest + jsdom + Testing Library (`npm test`). Coverage focuses on pure logic and library modules: matching, chat safety filters, city parsing, video validation, auth-recovery redirect logic, account deletion, AI/moderation proxy calls, and social graph helpers (follow/block/report/notifications/hashtags).
- `npm run lint` — ESLint (React hooks rules included)
- `npm run build` — production Vite build
- GitHub Actions CI (`.github/workflows/ci.yml`) runs lint → test → build on every push/PR to `main`.
- **Known gap**: no render/integration tests for page components yet — only library-level logic is covered. Highest priority next: integration tests for the auth/onboarding guard flow and the chat moderation pipeline.

## Deployment

Deployed on Vercel from `main`. See [SETUP.md](SETUP.md) for the full runbook: Supabase Auth URL config, Google OAuth setup, edge function secrets, and Vercel environment variables.

## Troubleshooting

- **Auth not working**: verify `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` match your Supabase project, and that redirect URLs are configured in Supabase Auth settings.
- **Avatar/listing upload failing**: confirm the relevant Storage bucket exists and its policy allows the upload; check file size/type.
- **Moments upload fails**: confirm `VITE_CLOUDINARY_CLOUD_NAME` is set and the `cloudinary-sign` edge function has its Cloudinary secrets configured (see SETUP.md).
- **AI icebreaker/moderation not working**: confirm `GROQ_API_KEY` (and optionally `OPENAI_API_KEY`) are set as `ai-proxy` edge function secrets — the client never calls AI providers directly.
- **Realtime events don't appear**: check the browser console for websocket errors and confirm Realtime is enabled for the relevant tables in Supabase.
