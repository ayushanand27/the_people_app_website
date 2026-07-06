-- H9: Indexes for hot filter columns (Discover, Dashboard, Groups, Events)

-- Discover / Dashboard: profiles by city where onboarding complete
CREATE INDEX IF NOT EXISTS idx_profiles_discover_city
  ON profiles (city, created_at DESC)
  WHERE onboarding_complete = true;

CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_complete
  ON profiles (onboarding_complete)
  WHERE onboarding_complete = true;

-- Groups by city
CREATE INDEX IF NOT EXISTS idx_groups_city
  ON groups (city);

-- Upcoming events by city + date
CREATE INDEX IF NOT EXISTS idx_events_city_date
  ON events (city, date);

-- Videos: following / saved tab server filters
CREATE INDEX IF NOT EXISTS idx_videos_user_created
  ON videos (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_videos_status_created
  ON videos (status, created_at DESC)
  WHERE status = 'published';
