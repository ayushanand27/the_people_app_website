-- Demo profiles for Discover / matches (idempotent)
-- Creates auth users + profile rows; passwords are random — demo accounts are view-only via app

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  demo RECORD;
  uid UUID;
BEGIN
  FOR demo IN
    SELECT * FROM (VALUES
      ('demo_arjun_blr',  'Arjun Mehta',    'arjun_blr',  'Bangalore',  ARRAY['Tech/Coding','Startups/Entrepreneurship','Gaming']),
      ('demo_priya_blr',  'Priya Sharma',   'priya_blr',  'Bangalore',  ARRAY['Art/Design','Photography','Travel']),
      ('demo_rahul_beg',  'Rahul Kumar',    'rahul_beg',  'Begusarai',  ARRAY['Food','Fitness','Movies/Cinema']),
      ('demo_neha_beg',   'Neha Singh',     'neha_beg',   'Begusarai',  ARRAY['Books/Reading','Philosophy','Podcasts']),
      ('demo_vikram_pat', 'Vikram Yadav',   'vikram_pat', 'Patna',      ARRAY['Tech/Coding','Chess','Philosophy']),
      ('demo_ananya_pat', 'Ananya Roy',     'ananya_pat', 'Patna',      ARRAY['Startups/Entrepreneurship','Finance/Investing','Travel']),
      ('demo_karan_jpr',  'Karan Rathore',  'karan_jpr',  'Jaipur',     ARRAY['Photography','Art/Design','Indie Music']),
      ('demo_simran_jpr', 'Simran Kaur',    'simran_jpr', 'Jaipur',     ARRAY['Tech/Coding','Startups/Entrepreneurship','Philosophy','Fitness'])
    ) AS t(email_key, full_name, username, city, interests)
  LOOP
    SELECT id INTO uid FROM auth.users WHERE email = demo.email_key || '@peopleapp.demo';
    IF uid IS NULL THEN
      uid := gen_random_uuid();
      INSERT INTO auth.users (
        id, instance_id, aud, role, email, encrypted_password,
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at, confirmation_token, email_change,
        email_change_token_new, recovery_token
      ) VALUES (
        uid,
        '00000000-0000-0000-0000-000000000000',
        'authenticated', 'authenticated',
        demo.email_key || '@peopleapp.demo',
        crypt('DemoSeedOnly!', gen_salt('bf')),
        NOW(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('full_name', demo.full_name),
        NOW(), NOW(), '', '', '', ''
      );
    END IF;

    INSERT INTO profiles (id, full_name, username, city, interests, bio, onboarding_complete)
    VALUES (
      uid,
      demo.full_name,
      demo.username,
      demo.city,
      demo.interests,
      'Demo profile for testing The People App.',
      true
    )
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      username = EXCLUDED.username,
      city = EXCLUDED.city,
      interests = EXCLUDED.interests,
      bio = EXCLUDED.bio,
      onboarding_complete = true;
  END LOOP;
END $$;
