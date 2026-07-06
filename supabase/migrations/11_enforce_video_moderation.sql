-- C3: Enforce video moderation — users cannot self-publish.

-- 1. Allow rejected status for admin moderation workflow
ALTER TABLE videos DROP CONSTRAINT IF EXISTS videos_status_check;
ALTER TABLE videos
  ADD CONSTRAINT videos_status_check
  CHECK (status IN ('published', 'pending_review', 'rejected'));

-- 2. Force pending_review on insert (ignore client-sent status)
CREATE OR REPLACE FUNCTION enforce_video_pending_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.status := 'pending_review';
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_video_pending_on_insert() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enforce_video_pending_on_insert() FROM anon, authenticated;

DROP TRIGGER IF EXISTS trg_video_force_pending_on_insert ON videos;
CREATE TRIGGER trg_video_force_pending_on_insert
  BEFORE INSERT ON videos
  FOR EACH ROW
  EXECUTE FUNCTION enforce_video_pending_on_insert();

-- 3. Non-admins cannot change status; admins may set published or rejected
CREATE OR REPLACE FUNCTION enforce_video_status_on_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT public.is_admin_user() THEN
      RAISE EXCEPTION 'Only admins can change video moderation status';
    END IF;
    IF NEW.status NOT IN ('published', 'rejected') THEN
      RAISE EXCEPTION 'Admins may only set status to published or rejected';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_video_status_on_update() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enforce_video_status_on_update() FROM anon, authenticated;

DROP TRIGGER IF EXISTS trg_video_enforce_status_on_update ON videos;
CREATE TRIGGER trg_video_enforce_status_on_update
  BEFORE UPDATE ON videos
  FOR EACH ROW
  EXECUTE FUNCTION enforce_video_status_on_update();
