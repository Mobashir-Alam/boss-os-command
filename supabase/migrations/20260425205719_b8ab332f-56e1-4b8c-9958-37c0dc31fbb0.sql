DO $$
DECLARE
  project_uid uuid := 'd0000000-0000-4000-8000-000000000001';
  rec RECORD;
  hashed_pw text := crypt('Test1234!', gen_salt('bf'));
BEGIN
  FOR rec IN
    SELECT * FROM (VALUES
      ('f0000000-0000-4000-8000-000000000002'::uuid, 'priya.test@nasheedio.com', 'Priya Sharma', 'tech'),
      ('f0000000-0000-4000-8000-000000000003'::uuid, 'rahul.test@nasheedio.com', 'Rahul Verma', 'tech'),
      ('f0000000-0000-4000-8000-000000000004'::uuid, 'aisha.test@nasheedio.com', 'Aisha Khan', 'tech')
    ) AS t(uid, email, name, dept)
  LOOP
    -- auth.users
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change,
      email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', rec.uid, 'authenticated', 'authenticated',
      rec.email, hashed_pw, now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', rec.name),
      now(), now(), '', '', '', ''
    ) ON CONFLICT (id) DO NOTHING;

    -- auth.identities
    INSERT INTO auth.identities (
      id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), rec.uid::text, rec.uid,
      jsonb_build_object('sub', rec.uid::text, 'email', rec.email),
      'email', now(), now(), now()
    ) ON CONFLICT DO NOTHING;

    -- profile
    INSERT INTO public.profiles (id, email, full_name, role, department)
    VALUES (rec.uid, rec.email, rec.name, 'team_member', rec.dept)
    ON CONFLICT (id) DO NOTHING;

    -- user_roles
    INSERT INTO public.user_roles (user_id, role)
    VALUES (rec.uid, 'team_member')
    ON CONFLICT DO NOTHING;

    -- project_members
    INSERT INTO public.project_members (project_id, profile_id, role, status, completion_percentage)
    VALUES (project_uid, rec.uid, 'member', 'in_progress', 0)
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;