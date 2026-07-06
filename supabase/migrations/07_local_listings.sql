-- Local listings: verified businesses per city (Bangalore, Begusarai, etc.)

CREATE TYPE listing_category AS ENUM (
  'real_estate',
  'construction',
  'hotels_food',
  'services',
  'shops',
  'clubs_events',
  'other'
);

CREATE TYPE listing_status AS ENUM (
  'pending',
  'verified',
  'rejected',
  'archived'
);

CREATE TYPE listing_update_status AS ENUM (
  'pending',
  'approved',
  'rejected'
);

CREATE TABLE IF NOT EXISTS local_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city TEXT NOT NULL,
  category listing_category NOT NULL DEFAULT 'other',
  title TEXT NOT NULL,
  description TEXT,
  price_text TEXT,
  phone TEXT,
  whatsapp TEXT,
  images TEXT[] NOT NULL DEFAULT '{}',
  owner_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status listing_status NOT NULL DEFAULT 'pending',
  verified_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_local_listings_city_category
  ON local_listings(city, category, status);

CREATE INDEX IF NOT EXISTS idx_local_listings_created
  ON local_listings(created_at DESC);

CREATE TABLE IF NOT EXISTS listing_update_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES local_listings(id) ON DELETE CASCADE,
  submitted_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  changes JSONB NOT NULL DEFAULT '{}',
  note TEXT,
  status listing_update_status NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_listing_updates_listing
  ON listing_update_requests(listing_id, status, created_at DESC);

CREATE OR REPLACE FUNCTION public.touch_local_listing_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_local_listings_updated ON local_listings;
CREATE TRIGGER tr_local_listings_updated
  BEFORE UPDATE ON local_listings
  FOR EACH ROW EXECUTE FUNCTION public.touch_local_listing_updated_at();

ALTER TABLE local_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_update_requests ENABLE ROW LEVEL SECURITY;

-- Public read: verified listings only
DROP POLICY IF EXISTS p_local_listings_select_verified ON local_listings;
CREATE POLICY p_local_listings_select_verified ON local_listings
  FOR SELECT TO authenticated
  USING (status = 'verified');

-- Admin: full access to listings
DROP POLICY IF EXISTS p_local_listings_admin_all ON local_listings;
CREATE POLICY p_local_listings_admin_all ON local_listings
  FOR ALL TO authenticated
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

-- Update requests: users can submit
DROP POLICY IF EXISTS p_listing_updates_insert ON listing_update_requests;
CREATE POLICY p_listing_updates_insert ON listing_update_requests
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = submitted_by);

DROP POLICY IF EXISTS p_listing_updates_select_own ON listing_update_requests;
CREATE POLICY p_listing_updates_select_own ON listing_update_requests
  FOR SELECT TO authenticated
  USING (submitted_by = auth.uid() OR public.is_admin_user());

DROP POLICY IF EXISTS p_listing_updates_admin ON listing_update_requests;
CREATE POLICY p_listing_updates_admin ON listing_update_requests
  FOR UPDATE TO authenticated
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

-- Storage: listing-images bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('listing-images', 'listing-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS listing_images_public_read ON storage.objects;
CREATE POLICY listing_images_public_read ON storage.objects
  FOR SELECT USING (bucket_id = 'listing-images');

DROP POLICY IF EXISTS listing_images_admin_write ON storage.objects;
CREATE POLICY listing_images_admin_write ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'listing-images' AND public.is_admin_user());

DROP POLICY IF EXISTS listing_images_admin_update ON storage.objects;
CREATE POLICY listing_images_admin_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'listing-images' AND public.is_admin_user());

DROP POLICY IF EXISTS listing_images_admin_delete ON storage.objects;
CREATE POLICY listing_images_admin_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'listing-images' AND public.is_admin_user());
