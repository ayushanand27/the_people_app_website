# Project Status — The People App (Short)

Status: Soft-launched — core features implemented, RLS-hardened, and deployed.

What we've achieved
- Auth: Email/password + Google OAuth via Supabase, with onboarding gate on protected routes
- Onboarding & Profiles: create, edit, avatar uploads (Supabase Storage)
- Discovery: search and filter users by city/interest, basic match scoring
- Communities: groups (create/join/leave) and events (create/RSVP/cancel)
- Real-time Chat: 1:1 messaging via Supabase realtime, with image support and keyword/AI moderation
- Moments: vertical video feed (Cloudinary upload) + likes
- Local: verified business/listing marketplace with admin approval flow
- Admin panel: CRUD for groups/events/listings, user listing, reports/moderation, bans
- AI helper: icebreaker generator proxied server-side through the `ai-proxy` Supabase Edge Function (no client-side API keys)
- Moderation: user blocking/reporting, blocked users hidden from profiles/discover/chat
- Security: 21 SQL migrations implementing RLS across all tables, `SECURITY DEFINER` helper functions to avoid RLS recursion, admin-only mutation policies
- Deployed: Vercel (https://the-people-app-website.vercel.app)

Tech stack
- Frontend: React 19 + Vite, react-router-dom 7, Tailwind 4
- Backend-as-a-Service: Supabase (Auth, Postgres + RLS, Realtime, Storage, Edge Functions)
- Media: Cloudinary for video/image uploads, signed server-side via `cloudinary-sign` Edge Function
- AI: Groq/OpenAI called only from the `ai-proxy` Edge Function — never exposed to the client
- Observability: Sentry (errors) + PostHog (analytics)
- Deployment: Vercel, with CSP/security headers in `vercel.json`
- Tests/CI: Vitest unit tests for core logic (matching, chat safety, cities, video upload) + GitHub Actions CI (lint/test/build)

Known gaps (as of 2026-08-10)
- No render/integration tests for page components — only pure-logic modules are covered
- Untested high-risk modules: authRecovery.js, authBootstrap.js, deleteAccount.js, ai.js, social.js
- No coverage thresholds enforced in CI

If picking up next: prioritize integration tests for the auth/onboarding guard flow and the moderation pipeline, since those are the highest-risk untested paths.
