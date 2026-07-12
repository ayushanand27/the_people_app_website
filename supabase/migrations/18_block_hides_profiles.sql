-- When either user blocks the other:
-- 1) Both can see the block row (so clients can filter lists)
-- 2) Neither can read the other's profile (admins still can)
-- Messaging insert already rejects blocked pairs (15_fix_block_rls_permissions.sql).

DROP POLICY IF EXISTS p_blocks_select ON blocks;
CREATE POLICY p_blocks_select ON blocks
  FOR SELECT TO authenticated
  USING (auth.uid() = blocker_id OR auth.uid() = blocked_id);

DROP POLICY IF EXISTS p_profiles_select ON profiles;
CREATE POLICY p_profiles_select ON profiles
  FOR SELECT TO authenticated
  USING (
    public.is_admin_user()
    OR auth.uid() = id
    OR NOT EXISTS (
      SELECT 1 FROM blocks
      WHERE (blocker_id = auth.uid() AND blocked_id = profiles.id)
         OR (blocker_id = profiles.id AND blocked_id = auth.uid())
    )
  );
