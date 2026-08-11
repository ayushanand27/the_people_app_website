-- Groups/events are only ever created, edited, or deleted through the Admin panel
-- (src/pages/Admin.jsx) — no user-facing UI writes to these tables. But the original
-- INSERT/UPDATE/DELETE policies only checked `auth.uid() = created_by`, so any
-- authenticated (non-admin) user could call the Supabase client directly to create,
-- edit, or delete their own groups/events, bypassing the admin-only UI gate.
-- Tighten these to require public.is_admin_user(), matching the DELETE policies
-- that were already admin-only.

DROP POLICY IF EXISTS p_groups_insert ON groups;
CREATE POLICY p_groups_insert ON groups FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_user() AND auth.uid() = created_by);

DROP POLICY IF EXISTS p_groups_update ON groups;
CREATE POLICY p_groups_update ON groups FOR UPDATE TO authenticated
  USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());

DROP POLICY IF EXISTS p_groups_delete ON groups;
-- p_groups_delete_admin (public.is_admin_user()) already covers DELETE.

DROP POLICY IF EXISTS p_events_insert ON events;
CREATE POLICY p_events_insert ON events FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_user() AND auth.uid() = created_by);

DROP POLICY IF EXISTS p_events_update ON events;
CREATE POLICY p_events_update ON events FOR UPDATE TO authenticated
  USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());

DROP POLICY IF EXISTS p_events_delete ON events;
-- p_events_delete_admin (public.is_admin_user()) already covers DELETE.
