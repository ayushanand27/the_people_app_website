-- Enforce group/event capacity server-side (UI-only checks are racy).

CREATE OR REPLACE FUNCTION public.enforce_group_capacity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  max_m int;
  cur int;
BEGIN
  SELECT max_members INTO max_m FROM groups WHERE id = NEW.group_id;
  IF max_m IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT count(*)::int INTO cur FROM group_members WHERE group_id = NEW.group_id;
  IF cur >= max_m THEN
    RAISE EXCEPTION 'Group is full';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_group_capacity ON group_members;
CREATE TRIGGER trg_group_capacity
  BEFORE INSERT ON group_members
  FOR EACH ROW EXECUTE FUNCTION public.enforce_group_capacity();

CREATE OR REPLACE FUNCTION public.enforce_event_capacity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  max_a int;
  cur int;
BEGIN
  SELECT max_attendees INTO max_a FROM events WHERE id = NEW.event_id;
  IF max_a IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT count(*)::int INTO cur FROM event_attendees WHERE event_id = NEW.event_id;
  IF cur >= max_a THEN
    RAISE EXCEPTION 'Event is full';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_event_capacity ON event_attendees;
CREATE TRIGGER trg_event_capacity
  BEFORE INSERT ON event_attendees
  FOR EACH ROW EXECUTE FUNCTION public.enforce_event_capacity();
