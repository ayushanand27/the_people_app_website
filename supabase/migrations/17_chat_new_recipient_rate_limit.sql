-- Max 10 new unique chat recipients per hour (anti mass-DM spam after public launch)

CREATE OR REPLACE FUNCTION check_new_dm_recipient_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  had_prior BOOLEAN;
  new_recipients INT;
BEGIN
  -- Continuing an existing thread is allowed (still subject to messages/min limit)
  SELECT EXISTS (
    SELECT 1 FROM messages
    WHERE sender_id = NEW.sender_id
      AND receiver_id = NEW.receiver_id
  ) INTO had_prior;

  IF had_prior THEN
    RETURN NEW;
  END IF;

  -- How many brand-new recipients has this sender started chatting with in the last hour?
  SELECT COUNT(*) INTO new_recipients
  FROM (
    SELECT m.receiver_id
    FROM messages m
    WHERE m.sender_id = NEW.sender_id
      AND m.created_at > NOW() - INTERVAL '1 hour'
      AND NOT EXISTS (
        SELECT 1 FROM messages older
        WHERE older.sender_id = m.sender_id
          AND older.receiver_id = m.receiver_id
          AND older.created_at <= NOW() - INTERVAL '1 hour'
      )
    GROUP BY m.receiver_id
  ) first_contacts;

  IF new_recipients >= 10 THEN
    RAISE EXCEPTION 'Rate limit: max 10 new chat recipients per hour';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.check_new_dm_recipient_rate_limit() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_new_dm_recipient_rate_limit() FROM anon, authenticated;

DROP TRIGGER IF EXISTS trg_new_dm_recipient_rate_limit ON messages;
CREATE TRIGGER trg_new_dm_recipient_rate_limit
  BEFORE INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION check_new_dm_recipient_rate_limit();
