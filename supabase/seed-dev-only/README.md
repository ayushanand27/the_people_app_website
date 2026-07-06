# Dev-only seed scripts

**Do not run these against production.**

These scripts create test data (including auth users with known passwords) for local or staging Supabase projects only. Run manually via SQL Editor — they are **not** in `migrations/` and will not auto-apply.

| Script | Purpose |
|--------|---------|
| `09_seed_demo_profiles.sql` | 8 demo users (`*@peopleapp.demo`) for Discover/matches testing |

To remove demo users from a database, use `supabase/scripts/remove_demo_users_production.sql`.
