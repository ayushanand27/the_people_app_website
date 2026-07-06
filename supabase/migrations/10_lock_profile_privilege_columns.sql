-- C2: Freeze privilege columns on self-profile updates.
-- Regular users cannot modify is_banned, is_premium, or follower/following counts.
-- Admins retain full control via p_profiles_admin_update (04_reports_moderation.sql).

DROP POLICY IF EXISTS p_profiles_update_own ON profiles;

CREATE POLICY p_profiles_update_own ON profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND is_admin = (SELECT p.is_admin FROM profiles p WHERE p.id = auth.uid())
    AND is_banned = (SELECT p.is_banned FROM profiles p WHERE p.id = auth.uid())
    AND is_premium = (SELECT p.is_premium FROM profiles p WHERE p.id = auth.uid())
    AND follower_count = (SELECT p.follower_count FROM profiles p WHERE p.id = auth.uid())
    AND following_count = (SELECT p.following_count FROM profiles p WHERE p.id = auth.uid())
  );
