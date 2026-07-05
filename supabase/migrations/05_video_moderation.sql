-- Video content moderation status

ALTER TABLE videos
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'published'
  CHECK (status IN ('published', 'pending_review'));

UPDATE videos SET status = 'published' WHERE status IS NULL;

-- Only published videos are public; uploader + admins see pending_review
DROP POLICY IF EXISTS p_videos_select ON videos;
CREATE POLICY p_videos_select ON videos FOR SELECT TO authenticated
  USING (
    status = 'published'
    OR user_id = auth.uid()
    OR public.is_admin_user()
  );

-- Admins can approve / update any video
DROP POLICY IF EXISTS p_videos_update_admin ON videos;
CREATE POLICY p_videos_update_admin ON videos FOR UPDATE TO authenticated
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());
