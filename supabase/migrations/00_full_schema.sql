-- ════════════════════════════════════════════════════════════════════════════
-- THE PEOPLE APP — COMPLETE SCHEMA (fresh Supabase project)
-- Run this ONCE in a brand-new project: Dashboard → SQL Editor → New query → Run
-- Idempotent: safe to re-run. Includes base tables, feature tables, RLS, triggers.
-- ════════════════════════════════════════════════════════════════════════════

-- ── PROFILES ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  username TEXT UNIQUE,
  bio TEXT,
  city TEXT,
  interests TEXT[],
  avatar_url TEXT,
  onboarding_complete BOOLEAN DEFAULT FALSE,
  is_premium BOOLEAN DEFAULT FALSE,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  is_banned BOOLEAN NOT NULL DEFAULT FALSE,
  follower_count INT DEFAULT 0,
  following_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create a profile row when a new auth user signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id) VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── MESSAGES ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(sender_id, receiver_id, created_at);

-- ── GROUPS ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  city TEXT,
  interests TEXT[],
  max_members INT DEFAULT 20,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- ── EVENTS ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  city TEXT,
  date TIMESTAMPTZ NOT NULL,
  location TEXT,
  max_attendees INT DEFAULT 30,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS event_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rsvpd_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- ── VIDEOS (Moments / Reels) ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT,
  description TEXT,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  duration INT,
  hashtags TEXT[] DEFAULT '{}',
  likes INT DEFAULT 0,
  views INT DEFAULT 0,
  comment_count INT DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'pending_review')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_videos_created ON videos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_videos_hashtags ON videos USING GIN(hashtags);

CREATE TABLE IF NOT EXISTS video_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  liked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(video_id, user_id)
);

CREATE TABLE IF NOT EXISTS video_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 500),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_video_comments_video ON video_comments(video_id, created_at DESC);

CREATE TABLE IF NOT EXISTS video_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(video_id, user_id)
);

-- ── SOCIAL GRAPH: FOLLOWS ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id <> following_id)
);
CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);

-- ── NOTIFICATIONS ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,   -- recipient
  actor_id UUID REFERENCES profiles(id) ON DELETE CASCADE,           -- who triggered it
  type TEXT NOT NULL CHECK (type IN ('like','comment','follow','message')),
  entity_id UUID,                                                    -- video/message id
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);

-- ── SAFETY: REPORTS & BLOCKS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('video','user','comment')),
  target_id UUID NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);

-- ════════════════════════════════════════════════════════════════════════════
-- COUNTER TRIGGERS
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION sync_video_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE videos SET likes = likes + 1 WHERE id = NEW.video_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE videos SET likes = GREATEST(likes - 1, 0) WHERE id = OLD.video_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.sync_video_like_count() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_video_like_count() FROM anon, authenticated;

DROP TRIGGER IF EXISTS trg_video_like_count ON video_likes;
CREATE TRIGGER trg_video_like_count
  AFTER INSERT OR DELETE ON video_likes
  FOR EACH ROW EXECUTE FUNCTION sync_video_like_count();

CREATE OR REPLACE FUNCTION sync_video_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE videos SET comment_count = comment_count + 1 WHERE id = NEW.video_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE videos SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = OLD.video_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.sync_video_comment_count() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_video_comment_count() FROM anon, authenticated;

DROP TRIGGER IF EXISTS trg_video_comment_count ON video_comments;
CREATE TRIGGER trg_video_comment_count
  AFTER INSERT OR DELETE ON video_comments
  FOR EACH ROW EXECUTE FUNCTION sync_video_comment_count();

CREATE OR REPLACE FUNCTION sync_follow_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE profiles SET following_count = following_count + 1 WHERE id = NEW.follower_id;
    UPDATE profiles SET follower_count  = follower_count  + 1 WHERE id = NEW.following_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE profiles SET following_count = GREATEST(following_count - 1, 0) WHERE id = OLD.follower_id;
    UPDATE profiles SET follower_count  = GREATEST(follower_count  - 1, 0) WHERE id = OLD.following_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.sync_follow_counts() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_follow_counts() FROM anon, authenticated;

DROP TRIGGER IF EXISTS trg_follow_counts ON follows;
CREATE TRIGGER trg_follow_counts
  AFTER INSERT OR DELETE ON follows
  FOR EACH ROW EXECUTE FUNCTION sync_follow_counts();

-- Safe view increment (called via RPC)
CREATE OR REPLACE FUNCTION increment_video_views(p_video_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE videos SET views = views + 1 WHERE id = p_video_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
GRANT EXECUTE ON FUNCTION increment_video_views(UUID) TO authenticated;

$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.increment_video_views(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.increment_video_views(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.increment_video_views(UUID) TO authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- RATE LIMITING
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION check_follow_rate_limit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE recent_count INT;
BEGIN
  SELECT COUNT(*) INTO recent_count FROM follows
  WHERE follower_id = NEW.follower_id AND created_at > NOW() - INTERVAL '60 seconds';
  IF recent_count >= 10 THEN RAISE EXCEPTION 'Rate limit: max 10 follows per 60 seconds'; END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.check_follow_rate_limit() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_follow_rate_limit() FROM anon, authenticated;
DROP TRIGGER IF EXISTS trg_follow_rate_limit ON follows;
CREATE TRIGGER trg_follow_rate_limit BEFORE INSERT ON follows
  FOR EACH ROW EXECUTE FUNCTION check_follow_rate_limit();

CREATE OR REPLACE FUNCTION check_report_rate_limit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE recent_count INT;
BEGIN
  SELECT COUNT(*) INTO recent_count FROM reports
  WHERE reporter_id = NEW.reporter_id AND created_at > NOW() - INTERVAL '10 minutes';
  IF recent_count >= 5 THEN RAISE EXCEPTION 'Rate limit: max 5 reports per 10 minutes'; END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.check_report_rate_limit() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_report_rate_limit() FROM anon, authenticated;
DROP TRIGGER IF EXISTS trg_report_rate_limit ON reports;
CREATE TRIGGER trg_report_rate_limit BEFORE INSERT ON reports
  FOR EACH ROW EXECUTE FUNCTION check_report_rate_limit();

CREATE OR REPLACE FUNCTION check_comment_rate_limit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE recent_count INT;
BEGIN
  SELECT COUNT(*) INTO recent_count FROM video_comments
  WHERE user_id = NEW.user_id AND created_at > NOW() - INTERVAL '60 seconds';
  IF recent_count >= 20 THEN RAISE EXCEPTION 'Rate limit: max 20 comments per minute'; END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.check_comment_rate_limit() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_comment_rate_limit() FROM anon, authenticated;
DROP TRIGGER IF EXISTS trg_comment_rate_limit ON video_comments;
CREATE TRIGGER trg_comment_rate_limit BEFORE INSERT ON video_comments
  FOR EACH ROW EXECUTE FUNCTION check_comment_rate_limit();

-- ════════════════════════════════════════════════════════════════════════════
-- REALTIME (chat + notifications)
-- ════════════════════════════════════════════════════════════════════════════
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE messages;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- ════════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ════════════════════════════════════════════════════════════════════════════
ALTER TABLE profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages         ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups           ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members    ENABLE ROW LEVEL SECURITY;
ALTER TABLE events           ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_attendees  ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos           ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_likes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_comments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_bookmarks  ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows          ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications    ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports          ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocks           ENABLE ROW LEVEL SECURITY;

-- Helper macro-ish: most tables are readable by any authenticated user.

-- PROFILES
DROP POLICY IF EXISTS p_profiles_select ON profiles;
CREATE POLICY p_profiles_select ON profiles FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS p_profiles_update_own ON profiles;
CREATE POLICY p_profiles_update_own ON profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND is_admin = (SELECT p.is_admin FROM profiles p WHERE p.id = auth.uid())
  );
DROP POLICY IF EXISTS p_profiles_insert_own ON profiles;
CREATE POLICY p_profiles_insert_own ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Admin helper + policies
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT is_admin FROM public.profiles WHERE id = auth.uid()), false);
$$;
REVOKE ALL ON FUNCTION public.is_admin_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin_user() TO authenticated;

DROP POLICY IF EXISTS p_groups_delete_admin ON groups;
CREATE POLICY p_groups_delete_admin ON groups FOR DELETE TO authenticated USING (public.is_admin_user());
DROP POLICY IF EXISTS p_events_delete_admin ON events;
CREATE POLICY p_events_delete_admin ON events FOR DELETE TO authenticated USING (public.is_admin_user());
DROP POLICY IF EXISTS p_videos_delete_admin ON videos;
CREATE POLICY p_videos_delete_admin ON videos FOR DELETE TO authenticated USING (public.is_admin_user());
DROP POLICY IF EXISTS p_reports_select_admin ON reports;
CREATE POLICY p_reports_select_admin ON reports FOR SELECT TO authenticated USING (public.is_admin_user());
DROP POLICY IF EXISTS p_reports_delete_admin ON reports;
CREATE POLICY p_reports_delete_admin ON reports FOR DELETE TO authenticated USING (public.is_admin_user());
DROP POLICY IF EXISTS p_reports_update_admin ON reports;
CREATE POLICY p_reports_update_admin ON reports FOR UPDATE TO authenticated
  USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());
DROP POLICY IF EXISTS p_profiles_admin_update ON profiles;
CREATE POLICY p_profiles_admin_update ON profiles FOR UPDATE TO authenticated
  USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());

-- MESSAGES (only participants)
DROP POLICY IF EXISTS p_messages_select ON messages;
CREATE POLICY p_messages_select ON messages FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
DROP POLICY IF EXISTS p_messages_insert ON messages;
CREATE POLICY p_messages_insert ON messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id);
DROP POLICY IF EXISTS p_messages_update ON messages;
CREATE POLICY p_messages_update ON messages FOR UPDATE TO authenticated
  USING (auth.uid() = receiver_id) WITH CHECK (auth.uid() = receiver_id);

-- GROUPS
DROP POLICY IF EXISTS p_groups_select ON groups;
CREATE POLICY p_groups_select ON groups FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS p_groups_insert ON groups;
CREATE POLICY p_groups_insert ON groups FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
DROP POLICY IF EXISTS p_groups_update ON groups;
CREATE POLICY p_groups_update ON groups FOR UPDATE TO authenticated USING (auth.uid() = created_by);
DROP POLICY IF EXISTS p_groups_delete ON groups;
CREATE POLICY p_groups_delete ON groups FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- GROUP MEMBERS
DROP POLICY IF EXISTS p_gm_select ON group_members;
CREATE POLICY p_gm_select ON group_members FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS p_gm_insert ON group_members;
CREATE POLICY p_gm_insert ON group_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS p_gm_delete ON group_members;
CREATE POLICY p_gm_delete ON group_members FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- EVENTS
DROP POLICY IF EXISTS p_events_select ON events;
CREATE POLICY p_events_select ON events FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS p_events_insert ON events;
CREATE POLICY p_events_insert ON events FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
DROP POLICY IF EXISTS p_events_update ON events;
CREATE POLICY p_events_update ON events FOR UPDATE TO authenticated USING (auth.uid() = created_by);
DROP POLICY IF EXISTS p_events_delete ON events;
CREATE POLICY p_events_delete ON events FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- EVENT ATTENDEES
DROP POLICY IF EXISTS p_ea_select ON event_attendees;
CREATE POLICY p_ea_select ON event_attendees FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS p_ea_insert ON event_attendees;
CREATE POLICY p_ea_insert ON event_attendees FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS p_ea_delete ON event_attendees;
CREATE POLICY p_ea_delete ON event_attendees FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- VIDEOS
DROP POLICY IF EXISTS p_videos_select ON videos;
CREATE POLICY p_videos_select ON videos FOR SELECT TO authenticated
  USING (
    status = 'published'
    OR user_id = auth.uid()
    OR public.is_admin_user()
  );
DROP POLICY IF EXISTS p_videos_insert ON videos;
CREATE POLICY p_videos_insert ON videos FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS p_videos_update ON videos;
CREATE POLICY p_videos_update ON videos FOR UPDATE TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS p_videos_update_admin ON videos;
CREATE POLICY p_videos_update_admin ON videos FOR UPDATE TO authenticated
  USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());
DROP POLICY IF EXISTS p_videos_delete ON videos;
CREATE POLICY p_videos_delete ON videos FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- VIDEO LIKES
DROP POLICY IF EXISTS p_vl_select ON video_likes;
CREATE POLICY p_vl_select ON video_likes FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS p_vl_insert ON video_likes;
CREATE POLICY p_vl_insert ON video_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS p_vl_delete ON video_likes;
CREATE POLICY p_vl_delete ON video_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- VIDEO COMMENTS
DROP POLICY IF EXISTS p_vc_select ON video_comments;
CREATE POLICY p_vc_select ON video_comments FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS p_vc_insert ON video_comments;
CREATE POLICY p_vc_insert ON video_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS p_vc_delete ON video_comments;
CREATE POLICY p_vc_delete ON video_comments FOR DELETE TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS p_video_comments_delete_admin ON video_comments;
CREATE POLICY p_video_comments_delete_admin ON video_comments FOR DELETE TO authenticated
  USING (public.is_admin_user());

-- VIDEO BOOKMARKS (private to owner)
DROP POLICY IF EXISTS p_vb_select ON video_bookmarks;
CREATE POLICY p_vb_select ON video_bookmarks FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS p_vb_insert ON video_bookmarks;
CREATE POLICY p_vb_insert ON video_bookmarks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS p_vb_delete ON video_bookmarks;
CREATE POLICY p_vb_delete ON video_bookmarks FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- FOLLOWS
DROP POLICY IF EXISTS p_follows_select ON follows;
CREATE POLICY p_follows_select ON follows FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS p_follows_insert ON follows;
CREATE POLICY p_follows_insert ON follows FOR INSERT TO authenticated WITH CHECK (auth.uid() = follower_id);
DROP POLICY IF EXISTS p_follows_delete ON follows;
CREATE POLICY p_follows_delete ON follows FOR DELETE TO authenticated USING (auth.uid() = follower_id);

-- NOTIFICATIONS (recipient reads own; anyone authenticated can create for others)
DROP POLICY IF EXISTS p_notif_select ON notifications;
CREATE POLICY p_notif_select ON notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS p_notif_insert ON notifications;
CREATE POLICY p_notif_insert ON notifications FOR INSERT TO authenticated WITH CHECK (auth.uid() = actor_id);
DROP POLICY IF EXISTS p_notif_update ON notifications;
CREATE POLICY p_notif_update ON notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- REPORTS (create own; no read for regular users)
DROP POLICY IF EXISTS p_reports_insert ON reports;
CREATE POLICY p_reports_insert ON reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);

-- BLOCKS (owner-only)
DROP POLICY IF EXISTS p_blocks_select ON blocks;
CREATE POLICY p_blocks_select ON blocks FOR SELECT TO authenticated USING (auth.uid() = blocker_id);
DROP POLICY IF EXISTS p_blocks_insert ON blocks;
CREATE POLICY p_blocks_insert ON blocks FOR INSERT TO authenticated WITH CHECK (auth.uid() = blocker_id);
DROP POLICY IF EXISTS p_blocks_delete ON blocks;
CREATE POLICY p_blocks_delete ON blocks FOR DELETE TO authenticated USING (auth.uid() = blocker_id);

-- ════════════════════════════════════════════════════════════════════════════
-- STORAGE: avatars bucket (run once)
-- ════════════════════════════════════════════════════════════════════════════
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects;
CREATE POLICY "avatars_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars_user_write" ON storage.objects;
CREATE POLICY "avatars_user_write" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "avatars_user_update" ON storage.objects;
CREATE POLICY "avatars_user_update" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ════════════════════════════════════════════════════════════════════════════
-- DONE. Configure Auth redirect URLs. Set Edge Function secrets. Promote admins via profiles.is_admin.
-- ════════════════════════════════════════════════════════════════════════════
