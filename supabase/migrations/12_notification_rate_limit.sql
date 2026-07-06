-- H1: Notification spam protection

-- 1. Tighten insert policy
DROP POLICY IF EXISTS p_notif_insert ON notifications;
CREATE POLICY p_notif_insert ON notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = actor_id
    AND user_id IS NOT NULL
    AND actor_id IS NOT NULL
  );

-- 2. Rate limit: max 20 notifications per recipient per 10 minutes from same actor
CREATE OR REPLACE FUNCTION check_notification_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_count INT;
BEGIN
  SELECT COUNT(*) INTO recent_count
  FROM notifications
  WHERE actor_id = NEW.actor_id
    AND user_id = NEW.user_id
    AND created_at > NOW() - INTERVAL '10 minutes';

  IF recent_count >= 20 THEN
    RAISE EXCEPTION 'Rate limit: max 20 notifications per recipient per 10 minutes';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.check_notification_rate_limit() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_notification_rate_limit() FROM anon, authenticated;

DROP TRIGGER IF EXISTS trg_notification_rate_limit ON notifications;
CREATE TRIGGER trg_notification_rate_limit
  BEFORE INSERT ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION check_notification_rate_limit();
