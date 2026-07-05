-- Step 3: is_admin flag + admin RLS policies
-- Run in Supabase SQL Editor (or via supabase db push)

-- ── Column + seed admin ───────────────────────────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;

UPDATE profiles
SET is_admin = true
WHERE id = '110a4af0-d055-4f1e-8c9f-de0395f7860b';

-- ── Helper: check if current user is admin ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin_user() TO authenticated;

-- ── Profiles: prevent self-promotion to admin ───────────────────────────────
DROP POLICY IF EXISTS p_profiles_update_own ON profiles;
CREATE POLICY p_profiles_update_own ON profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND is_admin = (SELECT p.is_admin FROM profiles p WHERE p.id = auth.uid())
  );

-- ── Admin: delete any group / event / video ───────────────────────────────────
DROP POLICY IF EXISTS p_groups_delete_admin ON groups;
CREATE POLICY p_groups_delete_admin ON groups
  FOR DELETE TO authenticated
  USING (public.is_admin_user());

DROP POLICY IF EXISTS p_events_delete_admin ON events;
CREATE POLICY p_events_delete_admin ON events
  FOR DELETE TO authenticated
  USING (public.is_admin_user());

DROP POLICY IF EXISTS p_videos_delete_admin ON videos;
CREATE POLICY p_videos_delete_admin ON videos
  FOR DELETE TO authenticated
  USING (public.is_admin_user());

-- ── Admin: read all reports ───────────────────────────────────────────────────
DROP POLICY IF EXISTS p_reports_select_admin ON reports;
CREATE POLICY p_reports_select_admin ON reports
  FOR SELECT TO authenticated
  USING (public.is_admin_user());

DROP POLICY IF EXISTS p_reports_delete_admin ON reports;
CREATE POLICY p_reports_delete_admin ON reports
  FOR DELETE TO authenticated
  USING (public.is_admin_user());
