# The People App — Setup & Deploy Guide

Project: **the_people_app** · Supabase ref: `zswjndrpokyqedxipfka`  
Live URL: https://the-prople-app-website.vercel.app

---

## Local `.env` (copy from `.env.example`)

```env
VITE_SUPABASE_URL=https://zswjndrpokyqedxipfka.supabase.co
VITE_SUPABASE_ANON_KEY=<from Supabase Dashboard → Settings → API>
VITE_CLOUDINARY_CLOUD_NAME=ddbkze6xa
VITE_SENTRY_DSN=<from Sentry → Project → Client Keys (DSN)>
VITE_POSTHOG_KEY=<from PostHog → Project → Settings → Project API Key>
VITE_POSTHOG_HOST=https://eu.i.posthog.com
```

**Never put in `.env`:** `GROQ_API_KEY`, `OPENAI_API_KEY`, `CLOUDINARY_API_SECRET` — these live in Supabase Edge Function secrets only.

---

## Supabase — already done via migrations

Migrations applied on project `zswjndrpokyqedxipfka`:

| Migration | What |
|-----------|------|
| `is_admin` | Admin flag + RLS |
| `security_functions` | Hardened triggers |
| `rate_limits` | Follow/report/comment limits |
| `04_reports_moderation` | Report status + user bans |
| `05_video_moderation` | Video `pending_review` + RLS |

Edge functions deployed: `cloudinary-sign`, `ai-proxy` (both ACTIVE).

### You must set in Supabase Dashboard

**Edge Functions → Secrets** (https://supabase.com/dashboard/project/zswjndrpokyqedxipfka/settings/functions):

| Secret | Used by |
|--------|---------|
| `CLOUDINARY_CLOUD_NAME` | cloudinary-sign |
| `CLOUDINARY_API_KEY` | cloudinary-sign |
| `CLOUDINARY_API_SECRET` | cloudinary-sign |
| `GROQ_API_KEY` | ai-proxy |
| `OPENAI_API_KEY` | ai-proxy (optional fallback) |

**Authentication → URL Configuration**:

- Site URL: `https://the-prople-app-website.vercel.app`
- Redirect URLs:
  ```
  http://localhost:5173
  http://localhost:5175
  https://the-prople-app-website.vercel.app
  https://the-prople-app-website.vercel.app/auth
  ```

**Authentication → Providers → Google** (required for "Continue with Google"):

1. Create OAuth credentials at https://console.cloud.google.com/apis/credentials
2. OAuth client type: **Web application**
3. **Authorized redirect URI** (exactly):
   ```
   https://zswjndrpokyqedxipfka.supabase.co/auth/v1/callback
   ```
4. Copy Client ID + Client Secret into Supabase → Auth → Providers → Google → Enable
5. Save

**Authentication → Providers → Email**: Enable. For password reset emails, ensure SMTP is configured or use Supabase default email.

**Authentication → Security**: Enable leaked password protection (recommended).

### Admin access

Admin is `profiles.is_admin = true` (not env var). Promote via SQL Editor:

```sql
UPDATE profiles SET is_admin = true WHERE id = 'YOUR-USER-UUID';
```

---

## Vercel — environment variables

Add in **Project → Settings → Environment Variables** (Production + Preview):

| Variable | Value |
|----------|-------|
| `VITE_SUPABASE_URL` | `https://zswjndrpokyqedxipfka.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | anon key from Supabase |
| `VITE_CLOUDINARY_CLOUD_NAME` | `ddbkze6xa` |
| `VITE_SENTRY_DSN` | Sentry DSN (EU) |
| `VITE_POSTHOG_KEY` | PostHog `phc_...` key |
| `VITE_POSTHOG_HOST` | `https://eu.i.posthog.com` |

After adding vars → **Redeploy** (Deployments → ⋯ → Redeploy).

Push latest code to `main` to trigger auto-deploy.

---

## Sentry — verify after deploy

1. Open production site
2. Sentry → **Issues** should show errors from real users
3. Optional: in Sentry → Settings → Client Keys, confirm DSN matches `VITE_SENTRY_DSN`

Sentry only runs in **production builds** (`import.meta.env.PROD`).

---

## PostHog — verify after deploy

1. Sign up / upload / follow on production site
2. PostHog → **Activity** → **Live events**
3. Events tracked: `signup`, `onboarding_complete`, `video_upload`, `follow`, `match_view`

PostHog only runs in **production builds**.

---

## Run locally

```bash
npm install
npm run dev
```

```bash
npm run lint
npm run build
```

---

## Feature checklist

- [ ] Sign up + onboarding
- [ ] Upload reel on `/moments`
- [ ] Follow, like, comment, notifications
- [ ] Report / block / admin reports tab
- [ ] Admin panel `/admin` (is_admin user)
- [ ] Sentry shows issues on production
- [ ] PostHog shows events on production

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Auth redirect error | Add Vercel URL to Supabase Auth redirect URLs |
| Upload fails | Set Cloudinary secrets on Supabase Edge Functions |
| AI moderation / icebreaker fails | Set `GROQ_API_KEY` on Edge Function secrets |
| Admin redirects to dashboard | Set `is_admin = true` on your profile |
| Sentry/PostHog empty locally | Normal — they only fire on production (Vercel) |
| Old Vercel deployment | Push to `main` and redeploy |
