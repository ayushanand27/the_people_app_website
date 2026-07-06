-- ════════════════════════════════════════════════════════════════════════════
-- REMOVE DEMO AUTH USERS FROM PRODUCTION
-- Target: *@peopleapp.demo (seeded by 09_seed_demo_profiles.sql)
--
-- ⚠️  PRODUCTION ONLY — review output of STEP 1 & 2 before running STEP 3.
-- ⚠️  Requires service-role / postgres privileges (Supabase SQL Editor or MCP).
-- ════════════════════════════════════════════════════════════════════════════

-- ── STEP 1: Preview users that will be deleted ───────────────────────────────
SELECT
  u.id,
  u.email,
  u.created_at,
  p.username,
  p.full_name,
  p.city
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.email LIKE '%@peopleapp.demo'
ORDER BY u.email;

-- ── STEP 2: Preview related row counts (should all be 0 for demo-only users) ─
WITH demo AS (
  SELECT id FROM auth.users WHERE email LIKE '%@peopleapp.demo'
)
SELECT 'auth.users'        AS tbl, count(*)::int AS n FROM auth.users        WHERE id IN (SELECT id FROM demo)
UNION ALL SELECT 'profiles',              count(*)::int FROM profiles              WHERE id IN (SELECT id FROM demo)
UNION ALL SELECT 'auth.identities',       count(*)::int FROM auth.identities       WHERE user_id IN (SELECT id FROM demo)
UNION ALL SELECT 'auth.sessions',        count(*)::int FROM auth.sessions        WHERE user_id IN (SELECT id FROM demo)
UNION ALL SELECT 'auth.refresh_tokens',   count(*)::int FROM auth.refresh_tokens   WHERE user_id IN (SELECT id FROM demo)
UNION ALL SELECT 'messages',             count(*)::int FROM messages             WHERE sender_id IN (SELECT id FROM demo) OR receiver_id IN (SELECT id FROM demo)
UNION ALL SELECT 'group_members',        count(*)::int FROM group_members        WHERE user_id IN (SELECT id FROM demo)
UNION ALL SELECT 'groups (created_by)',  count(*)::int FROM groups               WHERE created_by IN (SELECT id FROM demo)
UNION ALL SELECT 'event_attendees',      count(*)::int FROM event_attendees      WHERE user_id IN (SELECT id FROM demo)
UNION ALL SELECT 'events (created_by)',  count(*)::int FROM events               WHERE created_by IN (SELECT id FROM demo)
UNION ALL SELECT 'videos',               count(*)::int FROM videos               WHERE user_id IN (SELECT id FROM demo)
UNION ALL SELECT 'video_likes',          count(*)::int FROM video_likes          WHERE user_id IN (SELECT id FROM demo)
UNION ALL SELECT 'video_comments',       count(*)::int FROM video_comments       WHERE user_id IN (SELECT id FROM demo)
UNION ALL SELECT 'video_bookmarks',      count(*)::int FROM video_bookmarks      WHERE user_id IN (SELECT id FROM demo)
UNION ALL SELECT 'follows',              count(*)::int FROM follows              WHERE follower_id IN (SELECT id FROM demo) OR following_id IN (SELECT id FROM demo)
UNION ALL SELECT 'notifications',        count(*)::int FROM notifications        WHERE user_id IN (SELECT id FROM demo) OR actor_id IN (SELECT id FROM demo)
UNION ALL SELECT 'reports',              count(*)::int FROM reports              WHERE reporter_id IN (SELECT id FROM demo)
UNION ALL SELECT 'blocks',               count(*)::int FROM blocks               WHERE blocker_id IN (SELECT id FROM demo) OR blocked_id IN (SELECT id FROM demo)
UNION ALL SELECT 'listing_update_req',   count(*)::int FROM listing_update_requests WHERE submitted_by IN (SELECT id FROM demo)
UNION ALL SELECT 'storage.avatars',      count(*)::int FROM storage.objects
  WHERE bucket_id = 'avatars'
    AND (storage.foldername(name))[1] IN (SELECT id::text FROM demo);

-- ── STEP 3: Delete (run only after reviewing steps 1 & 2) ───────────────────
-- FK chain:
--   auth.users  →  profiles (ON DELETE CASCADE via profiles.id → auth.users.id)
--   profiles    →  messages, follows, videos, groups.created_by, etc. (ON DELETE CASCADE)
--   local_listings.owner_id / verified_by / reviewed_by → ON DELETE SET NULL (safe)
--
BEGIN;

DELETE FROM auth.users
WHERE email LIKE '%@peopleapp.demo';

-- ── STEP 4: Verify cleanup ────────────────────────────────────────────────────
DO $$
DECLARE
  remaining int;
BEGIN
  SELECT count(*) INTO remaining
  FROM auth.users
  WHERE email LIKE '%@peopleapp.demo';

  IF remaining > 0 THEN
    RAISE EXCEPTION 'Cleanup failed: % demo user(s) still remain', remaining;
  END IF;

  RAISE NOTICE 'Success: all @peopleapp.demo users removed';
END $$;

COMMIT;

-- ── STEP 5: Post-delete sanity check (run after commit) ───────────────────────
SELECT count(*)::int AS remaining_demo_users
FROM auth.users
WHERE email LIKE '%@peopleapp.demo';
