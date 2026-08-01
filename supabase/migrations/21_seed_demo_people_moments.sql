-- Pitchable demo density: people + published Moments across launch cities.
-- Idempotent. Demo accounts use @peopleapp.demo emails (not for real login in product copy).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  r RECORD;
  uid UUID;
  v_url TEXT;
  v_thumb TEXT;
  vid_count INT;
BEGIN
  -- Keep events upcoming for demos
  UPDATE events SET date = CASE city
    WHEN 'Bangalore' THEN NOW() + INTERVAL '5 days'
    WHEN 'Jaipur' THEN NOW() + INTERVAL '7 days'
    WHEN 'Begusarai' THEN NOW() + INTERVAL '4 days'
    WHEN 'Patna' THEN NOW() + INTERVAL '9 days'
    ELSE date
  END
  WHERE date < NOW() + INTERVAL '2 days';

  FOR r IN
    SELECT * FROM (VALUES
      -- Bangalore (6)
      ('d1000001-0000-4000-8000-000000000001'::uuid, 'demo.riya.blr@peopleapp.demo', 'Riya Sharma', 'demo_riya_blr', 'Bangalore',
       ARRAY['Tech/Coding','Startups/Entrepreneurship','Food'], 'Building in public · coffee chats welcome'),
      ('d1000002-0000-4000-8000-000000000002'::uuid, 'demo.arjun.blr@peopleapp.demo', 'Arjun Mehta', 'demo_arjun_blr', 'Bangalore',
       ARRAY['Gaming','Tech/Coding','Anime'], 'Weekend gamer · Indiranagar'),
      ('d1000003-0000-4000-8000-000000000003'::uuid, 'demo.sara.blr@peopleapp.demo', 'Sara Khan', 'demo_sara_blr', 'Bangalore',
       ARRAY['Art/Design','Photography','Indie Music'], 'Designer who shoots on film'),
      ('d1000004-0000-4000-8000-000000000004'::uuid, 'demo.vikram.blr@peopleapp.demo', 'Vikram Rao', 'demo_vikram_blr', 'Bangalore',
       ARRAY['Fitness','Food','Travel'], 'Runs + brunch · Koramangala'),
      ('d1000005-0000-4000-8000-000000000005'::uuid, 'demo.neha.blr@peopleapp.demo', 'Neha Patel', 'demo_neha_blr', 'Bangalore',
       ARRAY['Books/Reading','Philosophy','Podcasts'], 'Book club hopper'),
      ('d1000006-0000-4000-8000-000000000006'::uuid, 'demo.karthik.blr@peopleapp.demo', 'Karthik Iyer', 'demo_karthik_blr', 'Bangalore',
       ARRAY['Finance/Investing','Startups/Entrepreneurship','Chess'], 'Angel-curious · chess park'),

      -- Begusarai (6)
      ('d2000001-0000-4000-8000-000000000001'::uuid, 'demo.amit.bgs@peopleapp.demo', 'Amit Kumar', 'demo_amit_bgs', 'Begusarai',
       ARRAY['Food','Fitness','Travel'], 'Local food explorer'),
      ('d2000002-0000-4000-8000-000000000002'::uuid, 'demo.priya.bgs@peopleapp.demo', 'Priya Sinha', 'demo_priya_bgs', 'Begusarai',
       ARRAY['Art/Design','Photography','Books/Reading'], 'Sketching the city'),
      ('d2000003-0000-4000-8000-000000000003'::uuid, 'demo.rohan.bgs@peopleapp.demo', 'Rohan Das', 'demo_rohan_bgs', 'Begusarai',
       ARRAY['Tech/Coding','Gaming','Anime'], 'Learning web · looking for co-learners'),
      ('d2000004-0000-4000-8000-000000000004'::uuid, 'demo.anjali.bgs@peopleapp.demo', 'Anjali Devi', 'demo_anjali_bgs', 'Begusarai',
       ARRAY['Movies/Cinema','Indie Music','Food'], 'Weekend movie plans'),
      ('d2000005-0000-4000-8000-000000000005'::uuid, 'demo.suresh.bgs@peopleapp.demo', 'Suresh Yadav', 'demo_suresh_bgs', 'Begusarai',
       ARRAY['Fitness','Chess','Philosophy'], 'Morning walks · evening chess'),
      ('d2000006-0000-4000-8000-000000000006'::uuid, 'demo.kavita.bgs@peopleapp.demo', 'Kavita Jha', 'demo_kavita_bgs', 'Begusarai',
       ARRAY['Startups/Entrepreneurship','Finance/Investing','Podcasts'], 'Small business curious'),

      -- Patna (6)
      ('d3000001-0000-4000-8000-000000000001'::uuid, 'demo.aditya.ptn@peopleapp.demo', 'Aditya Singh', 'demo_aditya_ptn', 'Patna',
       ARRAY['Books/Reading','Philosophy','Podcasts'], 'Patna Book Club regular'),
      ('d3000002-0000-4000-8000-000000000002'::uuid, 'demo.isha.ptn@peopleapp.demo', 'Isha Verma', 'demo_isha_ptn', 'Patna',
       ARRAY['Art/Design','Photography','Travel'], 'Street photography'),
      ('d3000003-0000-4000-8000-000000000003'::uuid, 'demo.manish.ptn@peopleapp.demo', 'Manish Gupta', 'demo_manish_ptn', 'Patna',
       ARRAY['Tech/Coding','Startups/Entrepreneurship','Chess'], 'Builder in Bihar'),
      ('d3000004-0000-4000-8000-000000000004'::uuid, 'demo.pooja.ptn@peopleapp.demo', 'Pooja Kumari', 'demo_pooja_ptn', 'Patna',
       ARRAY['Food','Movies/Cinema','Fitness'], 'Thali recommendations on demand'),
      ('d3000005-0000-4000-8000-000000000005'::uuid, 'demo.rahul.ptn@peopleapp.demo', 'Rahul Nair', 'demo_rahul_ptn', 'Patna',
       ARRAY['Gaming','Anime','Indie Music'], 'LAN nights · new friends'),
      ('d3000006-0000-4000-8000-000000000006'::uuid, 'demo.sneha.ptn@peopleapp.demo', 'Sneha Reddy', 'demo_sneha_ptn', 'Patna',
       ARRAY['Finance/Investing','Books/Reading','Travel'], 'Markets + novels'),

      -- Jaipur (6)
      ('d4000001-0000-4000-8000-000000000001'::uuid, 'demo.meera.jpr@peopleapp.demo', 'Meera Agarwal', 'demo_meera_jpr', 'Jaipur',
       ARRAY['Art/Design','Photography','Travel'], 'Pink City creatives'),
      ('d4000002-0000-4000-8000-000000000002'::uuid, 'demo.yash.jpr@peopleapp.demo', 'Yash Sharma', 'demo_yash_jpr', 'Jaipur',
       ARRAY['Startups/Entrepreneurship','Tech/Coding','Food'], 'Jaipur Startup Circle'),
      ('d4000003-0000-4000-8000-000000000003'::uuid, 'demo.divya.jpr@peopleapp.demo', 'Divya Jain', 'demo_divya_jpr', 'Jaipur',
       ARRAY['Indie Music','Movies/Cinema','Books/Reading'], 'Vinyl + chai'),
      ('d4000004-0000-4000-8000-000000000004'::uuid, 'demo.harsh.jpr@peopleapp.demo', 'Harsh Malhotra', 'demo_harsh_jpr', 'Jaipur',
       ARRAY['Fitness','Travel','Photography'], 'Photo walks every Sunday'),
      ('d4000005-0000-4000-8000-000000000005'::uuid, 'demo.nina.jpr@peopleapp.demo', 'Nina Kapoor', 'demo_nina_jpr', 'Jaipur',
       ARRAY['Philosophy','Podcasts','Chess'], 'Deep talks preferred'),
      ('d4000006-0000-4000-8000-000000000006'::uuid, 'demo.kabir.jpr@peopleapp.demo', 'Kabir Singh', 'demo_kabir_jpr', 'Jaipur',
       ARRAY['Gaming','Anime','Tech/Coding'], 'Looking for co-op squad')
    ) AS t(id, email, full_name, username, city, interests, bio)
  LOOP
    IF EXISTS (SELECT 1 FROM auth.users WHERE id = r.id OR email = r.email) THEN
      CONTINUE;
    END IF;
    IF EXISTS (SELECT 1 FROM profiles WHERE username = r.username) THEN
      CONTINUE;
    END IF;

    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token,
      email_change, email_change_token_new, email_change_token_current,
      reauthentication_token, is_sso_user, is_anonymous
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      r.id,
      'authenticated',
      'authenticated',
      r.email,
      crypt('DemoPass123!', gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', r.full_name),
      NOW(),
      NOW(),
      '',
      '',
      '',
      '',
      '',
      '',
      false,
      false
    );

    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(),
      r.id,
      jsonb_build_object('sub', r.id::text, 'email', r.email, 'email_verified', true),
      'email',
      r.id::text,
      NOW(),
      NOW(),
      NOW()
    );

    UPDATE profiles SET
      full_name = r.full_name,
      username = r.username,
      city = r.city,
      interests = r.interests,
      bio = r.bio,
      onboarding_complete = true
    WHERE id = r.id;
  END LOOP;

  -- Published Moments (disable moderation triggers for seed only)
  ALTER TABLE videos DISABLE TRIGGER trg_video_force_pending_on_insert;
  ALTER TABLE videos DISABLE TRIGGER trg_video_enforce_status_on_update;

  FOR r IN
    SELECT * FROM (VALUES
      ('demo_riya_blr', 'Morning in Indiranagar', 'Coffee walk energy', 'Bangalore',
       'https://res.cloudinary.com/demo/video/upload/dog.mp4',
       'https://res.cloudinary.com/demo/video/upload/so_0/dog.jpg', ARRAY['bangalore','coffee']),
      ('demo_sara_blr', 'Film grain Sunday', 'Shooting around the city', 'Bangalore',
       'https://res.cloudinary.com/demo/video/upload/elephants.mp4',
       'https://res.cloudinary.com/demo/video/upload/so_0/elephants.jpg', ARRAY['design','photo']),
      ('demo_arjun_blr', 'Late night build', 'Hack session vibes', 'Bangalore',
       'https://res.cloudinary.com/demo/video/upload/ski_jump.mp4',
       'https://res.cloudinary.com/demo/video/upload/so_0/ski_jump.jpg', ARRAY['tech','gaming']),
      ('demo_amit_bgs', 'Begusarai evenings', 'Local streets after rain', 'Begusarai',
       'https://res.cloudinary.com/demo/video/upload/dog.mp4',
       'https://res.cloudinary.com/demo/video/upload/so_0/dog.jpg', ARRAY['begusarai','local']),
      ('demo_priya_bgs', 'Sketch break', 'Quick outdoor sketch', 'Begusarai',
       'https://res.cloudinary.com/demo/video/upload/elephants.mp4',
       'https://res.cloudinary.com/demo/video/upload/so_0/elephants.jpg', ARRAY['art']),
      ('demo_rohan_bgs', 'Learning in public', 'Web dev progress', 'Begusarai',
       'https://res.cloudinary.com/demo/video/upload/ski_jump.mp4',
       'https://res.cloudinary.com/demo/video/upload/so_0/ski_jump.jpg', ARRAY['coding']),
      ('demo_aditya_ptn', 'Book club haul', 'This month''s reads', 'Patna',
       'https://res.cloudinary.com/demo/video/upload/dog.mp4',
       'https://res.cloudinary.com/demo/video/upload/so_0/dog.jpg', ARRAY['books','patna']),
      ('demo_isha_ptn', 'Patna light', 'Golden hour frames', 'Patna',
       'https://res.cloudinary.com/demo/video/upload/elephants.mp4',
       'https://res.cloudinary.com/demo/video/upload/so_0/elephants.jpg', ARRAY['photo']),
      ('demo_manish_ptn', 'Builder diary', 'Shipping from Patna', 'Patna',
       'https://res.cloudinary.com/demo/video/upload/ski_jump.mp4',
       'https://res.cloudinary.com/demo/video/upload/so_0/ski_jump.jpg', ARRAY['startups']),
      ('demo_meera_jpr', 'Pink City walk', 'Colors everywhere', 'Jaipur',
       'https://res.cloudinary.com/demo/video/upload/dog.mp4',
       'https://res.cloudinary.com/demo/video/upload/so_0/dog.jpg', ARRAY['jaipur','photo']),
      ('demo_yash_jpr', 'Founder coffee', 'Startup Circle clips', 'Jaipur',
       'https://res.cloudinary.com/demo/video/upload/elephants.mp4',
       'https://res.cloudinary.com/demo/video/upload/so_0/elephants.jpg', ARRAY['startups']),
      ('demo_harsh_jpr', 'Sunday photo walk', 'Old city trails', 'Jaipur',
       'https://res.cloudinary.com/demo/video/upload/ski_jump.mp4',
       'https://res.cloudinary.com/demo/video/upload/so_0/ski_jump.jpg', ARRAY['fitness','photo'])
    ) AS t(username, title, description, city, video_url, thumbnail_url, hashtags)
  LOOP
    SELECT id INTO uid FROM profiles WHERE username = r.username LIMIT 1;
    IF uid IS NULL THEN
      CONTINUE;
    END IF;

    SELECT count(*)::int INTO vid_count
    FROM videos v
    WHERE v.user_id = uid AND v.title = r.title;

    IF vid_count > 0 THEN
      CONTINUE;
    END IF;

    v_url := r.video_url;
    v_thumb := r.thumbnail_url;

    INSERT INTO videos (
      user_id, title, description, video_url, thumbnail_url,
      duration, hashtags, likes, views, comment_count, status
    ) VALUES (
      uid, r.title, r.description, v_url, v_thumb,
      15, r.hashtags, 3 + (random() * 20)::int, 20 + (random() * 80)::int, 0, 'published'
    );
  END LOOP;

  ALTER TABLE videos ENABLE TRIGGER trg_video_force_pending_on_insert;
  ALTER TABLE videos ENABLE TRIGGER trg_video_enforce_status_on_update;
END $$;
