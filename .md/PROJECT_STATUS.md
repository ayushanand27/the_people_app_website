# Project Status — The People App (Short)

Status: Active prototype — core features implemented and deployed.

What we've achieved
- Auth: Email/password + Google OAuth via Supabase
- Onboarding & Profiles: create, edit, avatar uploads (Supabase Storage)
- Discovery: search and filter users by city/interest, basic match scoring
- Communities: groups (create/join/leave) and events (create/RSVP)
- Real-time Chat: 1:1 messaging using Supabase realtime subscriptions
- Moments: vertical video upload (Cloudinary) + likes
- Admin panel: basic CRUD for groups/events and user listing
- AI helper: optional icebreaker generator (`src/lib/ai.js`) using OpenAI (config optional)
- Deployed: Vercel (live URLs added to README)

Tech stack
- Frontend: React + Vite
- Backend-as-a-Service: Supabase (Auth, Database, Realtime, Storage)
- Media: Cloudinary for video uploads
- Optional AI: OpenAI (client helper present but should be moved server-side for prod)
- Deployment: Vercel

Immediate next steps
- Add `.env.example` and document required env vars
- Harden Supabase with Row Level Security (RLS) policies
- Move AI calls server-side and secure Cloudinary uploads
- Add basic tests and CI

If you want, I can create the `.env.example` and a short RLS policy template next.
