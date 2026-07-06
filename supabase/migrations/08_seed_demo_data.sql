-- Demo seed data for launch cities (idempotent inserts)

DO $$
DECLARE
  admin_id UUID;
BEGIN
  SELECT id INTO admin_id FROM profiles WHERE is_admin = true LIMIT 1;
  IF admin_id IS NULL THEN
    SELECT id INTO admin_id FROM profiles ORDER BY created_at LIMIT 1;
  END IF;
  IF admin_id IS NULL THEN
    RAISE NOTICE 'No admin profile — skip seed';
    RETURN;
  END IF;

  -- LOCAL LISTINGS (verified)
  INSERT INTO local_listings (city, category, title, description, price_text, phone, whatsapp, status, verified_by, verified_at)
  SELECT v.city, v.category::listing_category, v.title, v.description, v.price_text, v.phone, v.whatsapp, 'verified', admin_id, NOW()
  FROM (VALUES
    ('Bangalore', 'real_estate', 'Koramangala PG for Students', 'Furnished PG near tech parks. WiFi, meals included.', '₹12,000/month', '9876543210', '9876543210'),
    ('Bangalore', 'hotels_food', 'Third Wave Coffee Koramangala', 'Specialty coffee & brunch. Open 8am–11pm.', '₹200–500', '9876543211', '9876543211'),
    ('Bangalore', 'clubs_events', 'Bangalore Tech Meetup', 'Weekly meetup for developers & founders.', 'Free entry', '9876543212', '9876543212'),
    ('Begusarai', 'construction', 'Sharma Balu & Gitti Supply', 'Quality sand and gravel delivery across Begusarai.', '₹45/cft', '9123456780', '9123456780'),
    ('Begusarai', 'hotels_food', 'Hotel Raj Darbar', 'AC rooms, banquet hall. Near railway station.', '₹1,200/night', '9123456781', '9123456781'),
    ('Begusarai', 'real_estate', 'Begusarai Plot & Flat Dealer', 'Residential plots and rentals. Verified listings.', 'From ₹8 lakh', '9123456782', '9123456782'),
    ('Patna', 'services', 'Patna Home Tutors', 'Math, Science, JEE coaching at home.', '₹500/hour', '9234567890', '9234567890'),
    ('Patna', 'shops', 'Maurya Electronics', 'Mobile, laptop repair & accessories.', 'Varies', '9234567891', '9234567891'),
    ('Patna', 'hotels_food', 'Bihar Kitchen Restaurant', 'Authentic Bihari thali & snacks.', '₹150–400', '9234567892', '9234567892'),
    ('Jaipur', 'shops', 'Johari Bazaar Handicrafts', 'Traditional Rajasthani gifts & decor.', '₹100–5,000', '9345678901', '9345678901'),
    ('Jaipur', 'hotels_food', 'Pink City Heritage Hotel', 'Heritage stay near Hawa Mahal.', '₹2,500/night', '9345678902', '9345678902'),
    ('Jaipur', 'clubs_events', 'Jaipur Startup Circle', 'Networking for entrepreneurs every Saturday.', 'Free', '9345678903', '9345678903')
  ) AS v(city, category, title, description, price_text, phone, whatsapp)
  WHERE NOT EXISTS (
    SELECT 1 FROM local_listings l WHERE l.title = v.title AND l.city = v.city
  );

  -- GROUPS
  INSERT INTO groups (name, description, city, interests, max_members, created_by)
  SELECT v.name, v.description, v.city, v.interests, 30, admin_id
  FROM (VALUES
    ('Bangalore Builders', 'Tech founders & coders in BLR', 'Bangalore', ARRAY['Tech/Coding','Startups/Entrepreneurship']),
    ('Begusarai Locals', 'Connect with people in Begusarai', 'Begusarai', ARRAY['Food','Fitness']),
    ('Patna Book Club', 'Monthly reads & discussions', 'Patna', ARRAY['Books/Reading','Philosophy']),
    ('Jaipur Creatives', 'Art, design & photography', 'Jaipur', ARRAY['Art/Design','Photography'])
  ) AS v(name, description, city, interests)
  WHERE NOT EXISTS (SELECT 1 FROM groups g WHERE g.name = v.name AND g.city = v.city);

  -- EVENTS (upcoming)
  INSERT INTO events (title, description, city, date, location, max_attendees, created_by)
  SELECT v.title, v.description, v.city, v.date::timestamptz, v.location, 50, admin_id
  FROM (VALUES
    ('BLR Tech Coffee Chat', 'Casual networking for techies', 'Bangalore', (NOW() + INTERVAL '5 days')::text, 'Indiranagar', 50),
    ('Begusarai Food Fest', 'Local food vendors & music', 'Begusarai', (NOW() + INTERVAL '7 days')::text, 'Gandhi Maidan', 100),
    ('Patna Philosophy Night', 'Open discussion on ethics & life', 'Patna', (NOW() + INTERVAL '10 days')::text, 'Boring Road Cafe', 30),
    ('Jaipur Photo Walk', 'Explore old city with cameras', 'Jaipur', (NOW() + INTERVAL '6 days')::text, 'Hawa Mahal', 25)
  ) AS v(title, description, city, date, location, max_attendees)
  WHERE NOT EXISTS (SELECT 1 FROM events e WHERE e.title = v.title AND e.city = v.city);

END $$;
