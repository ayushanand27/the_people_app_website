-- Fix: infinite recursion on profiles during onboarding UPDATE.
-- Cause: p_profiles_update_own WITH CHECK subqueried profiles → p_profiles_select
-- called is_admin_user() → SELECT profiles again → recursion.
-- Also: SELECT policy must not re-enter profiles via RLS-sensitive helpers.

CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin_user() TO authenticated;

-- Read privilege columns without re-entering profiles RLS
CREATE OR REPLACE FUNCTION public.profile_privilege_snapshot(uid uuid)
RETURNS TABLE (
  is_admin boolean,
  is_banned boolean,
  is_premium boolean,
  follower_count integer,
  following_count integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT p.is_admin, p.is_banned, p.is_premium, p.follower_count, p.following_count
  FROM public.profiles p
  WHERE p.id = uid;
$$;

REVOKE ALL ON FUNCTION public.profile_privilege_snapshot(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.profile_privilege_snapshot(uuid) TO authenticated;

-- Visible if self, admin, or not blocked either way (blocks only — no profiles subquery)
CREATE OR REPLACE FUNCTION public.can_view_profile(target_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT
    target_id = auth.uid()
    OR COALESCE((SELECT is_admin FROM public.profiles WHERE id = auth.uid()), false)
    OR NOT EXISTS (
      SELECT 1 FROM public.blocks
      WHERE (blocker_id = auth.uid() AND blocked_id = target_id)
         OR (blocker_id = target_id AND blocked_id = auth.uid())
    );
$$;

REVOKE ALL ON FUNCTION public.can_view_profile(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_view_profile(uuid) TO authenticated;

DROP POLICY IF EXISTS p_profiles_select ON profiles;
CREATE POLICY p_profiles_select ON profiles
  FOR SELECT TO authenticated
  USING (public.can_view_profile(id));

DROP POLICY IF EXISTS p_profiles_update_own ON profiles;
CREATE POLICY p_profiles_update_own ON profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND is_admin = (SELECT s.is_admin FROM public.profile_privilege_snapshot(auth.uid()) s)
    AND is_banned = (SELECT s.is_banned FROM public.profile_privilege_snapshot(auth.uid()) s)
    AND is_premium = (SELECT s.is_premium FROM public.profile_privilege_snapshot(auth.uid()) s)
    AND follower_count = (SELECT s.follower_count FROM public.profile_privilege_snapshot(auth.uid()) s)
    AND following_count = (SELECT s.following_count FROM public.profile_privilege_snapshot(auth.uid()) s)
  );
