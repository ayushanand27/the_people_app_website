-- Step 4: Reports moderation + user bans

-- ── Reports status workflow ───────────────────────────────────────────────────
ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending'
  CHECK (status IN ('pending', 'resolved', 'dismissed'));

UPDATE reports SET status = 'pending' WHERE status IS NULL;

-- ── Ban flag on profiles ──────────────────────────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_banned BOOLEAN NOT NULL DEFAULT false;

-- ── Admin: update report status ───────────────────────────────────────────────
DROP POLICY IF EXISTS p_reports_update_admin ON reports;
CREATE POLICY p_reports_update_admin ON reports
  FOR UPDATE TO authenticated
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

-- ── Admin: ban users (update any profile) ─────────────────────────────────────
DROP POLICY IF EXISTS p_profiles_admin_update ON profiles;
CREATE POLICY p_profiles_admin_update ON profiles
  FOR UPDATE TO authenticated
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

-- ── Admin: delete any comment ─────────────────────────────────────────────────
DROP POLICY IF EXISTS p_video_comments_delete_admin ON video_comments;
CREATE POLICY p_video_comments_delete_admin ON video_comments
  FOR DELETE TO authenticated
  USING (public.is_admin_user());
