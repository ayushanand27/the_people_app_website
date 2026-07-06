-- Batch 4: Block enforcement + message/video rate limits

-- Helper: blocked in either direction (not callable via RPC by clients)
CREATE OR REPLACE FUNCTION public.users_are_blocked(uid_a UUID, uid_b UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM blocks
    WHERE (blocker_id = uid_a AND blocked_id = uid_b)
       OR (blocker_id = uid_b AND blocked_id = uid_a)
  );
$$;

REVOKE ALL ON FUNCTION public.users_are_blocked(UUID, UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.users_are_blocked(UUID, UUID) FROM anon, authenticated;

-- Messages: block check on insert
DROP POLICY IF EXISTS p_messages_insert ON messages;
CREATE POLICY p_messages_insert ON messages
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND NOT public.users_are_blocked(sender_id, receiver_id)
  );

-- Follows: block check on insert
DROP POLICY IF EXISTS p_follows_insert ON follows;
CREATE POLICY p_follows_insert ON follows
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = follower_id
    AND NOT public.users_are_blocked(follower_id, following_id)
  );

-- Messages: max 30 per minute per sender
CREATE OR REPLACE FUNCTION check_message_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_count INT;
BEGIN
  SELECT COUNT(*) INTO recent_count
  FROM messages
  WHERE sender_id = NEW.sender_id
    AND created_at > NOW() - INTERVAL '60 seconds';

  IF recent_count >= 30 THEN
    RAISE EXCEPTION 'Rate limit: max 30 messages per minute';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.check_message_rate_limit() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_message_rate_limit() FROM anon, authenticated;

DROP TRIGGER IF EXISTS trg_message_rate_limit ON messages;
CREATE TRIGGER trg_message_rate_limit
  BEFORE INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION check_message_rate_limit();

-- Videos: max 5 uploads per 10 minutes per user
CREATE OR REPLACE FUNCTION check_video_upload_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_count INT;
BEGIN
  SELECT COUNT(*) INTO recent_count
  FROM videos
  WHERE user_id = NEW.user_id
    AND created_at > NOW() - INTERVAL '10 minutes';

  IF recent_count >= 5 THEN
    RAISE EXCEPTION 'Rate limit: max 5 video uploads per 10 minutes';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.check_video_upload_rate_limit() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_video_upload_rate_limit() FROM anon, authenticated;

DROP TRIGGER IF EXISTS trg_video_upload_rate_limit ON videos;
CREATE TRIGGER trg_video_upload_rate_limit
  BEFORE INSERT ON videos
  FOR EACH ROW
  EXECUTE FUNCTION check_video_upload_rate_limit();
