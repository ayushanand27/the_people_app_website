-- Step 5: Rate limiting via BEFORE INSERT triggers

CREATE OR REPLACE FUNCTION check_follow_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_count INT;
BEGIN
  SELECT COUNT(*) INTO recent_count
  FROM follows
  WHERE follower_id = NEW.follower_id
    AND created_at > NOW() - INTERVAL '60 seconds';

  IF recent_count >= 10 THEN
    RAISE EXCEPTION 'Rate limit: max 10 follows per 60 seconds';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.check_follow_rate_limit() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_follow_rate_limit() FROM anon, authenticated;

DROP TRIGGER IF EXISTS trg_follow_rate_limit ON follows;
CREATE TRIGGER trg_follow_rate_limit
  BEFORE INSERT ON follows
  FOR EACH ROW EXECUTE FUNCTION check_follow_rate_limit();

-- ── Reports: max 5 per 10 minutes ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION check_report_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_count INT;
BEGIN
  SELECT COUNT(*) INTO recent_count
  FROM reports
  WHERE reporter_id = NEW.reporter_id
    AND created_at > NOW() - INTERVAL '10 minutes';

  IF recent_count >= 5 THEN
    RAISE EXCEPTION 'Rate limit: max 5 reports per 10 minutes';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.check_report_rate_limit() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_report_rate_limit() FROM anon, authenticated;

DROP TRIGGER IF EXISTS trg_report_rate_limit ON reports;
CREATE TRIGGER trg_report_rate_limit
  BEFORE INSERT ON reports
  FOR EACH ROW EXECUTE FUNCTION check_report_rate_limit();

-- ── Comments: max 20 per minute ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION check_comment_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_count INT;
BEGIN
  SELECT COUNT(*) INTO recent_count
  FROM video_comments
  WHERE user_id = NEW.user_id
    AND created_at > NOW() - INTERVAL '60 seconds';

  IF recent_count >= 20 THEN
    RAISE EXCEPTION 'Rate limit: max 20 comments per minute';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.check_comment_rate_limit() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_comment_rate_limit() FROM anon, authenticated;

DROP TRIGGER IF EXISTS trg_comment_rate_limit ON video_comments;
CREATE TRIGGER trg_comment_rate_limit
  BEFORE INSERT ON video_comments
  FOR EACH ROW EXECUTE FUNCTION check_comment_rate_limit();
