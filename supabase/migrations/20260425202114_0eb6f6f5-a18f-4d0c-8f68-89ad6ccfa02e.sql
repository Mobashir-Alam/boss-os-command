DO $$
DECLARE
  test_uid uuid := 'f0000000-0000-4000-8000-000000000001'::uuid;
  test_email text := 'arjun.test@nasheedio.com';
  test_password text := 'Test1234!';
BEGIN

  -- 1. Auth user
  INSERT INTO auth.users (
    id, instance_id, aud, role,
    email, encrypted_password, email_confirmed_at,
    confirmation_token, recovery_token,
    email_change_token_new, email_change, email_change_token_current,
    raw_app_meta_data, raw_user_meta_data,
    is_super_admin, created_at, updated_at,
    phone, phone_change, phone_change_token,
    email_change_confirm_status, is_sso_user
  ) VALUES (
    test_uid,
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    test_email,
    crypt(test_password, gen_salt('bf')),
    now(),
    '', '', '', '', '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    false, now(), now(),
    null, '', '',
    0, false
  ) ON CONFLICT (id) DO NOTHING;

  -- 2. Auth identity (required for email login)
  INSERT INTO auth.identities (
    id, user_id, provider_id,
    identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    test_uid,
    test_uid,
    test_email,
    jsonb_build_object('sub', test_uid::text, 'email', test_email),
    'email',
    now(), now(), now()
  ) ON CONFLICT (id) DO NOTHING;

  -- 3. Profile
  INSERT INTO public.profiles (id, email, full_name, role, department)
  VALUES (test_uid, test_email, 'Arjun Mehta', 'team_member', 'tech')
  ON CONFLICT (id) DO UPDATE SET
    full_name  = EXCLUDED.full_name,
    role       = EXCLUDED.role,
    department = EXCLUDED.department;

  -- 4. Add to Creator Analytics Dashboard v2 (project d0000000-...001)
  --    Using a new member row with this real auth UUID as profile_id
  INSERT INTO public.project_members (
    id, project_id, profile_id, person_id,
    role, task_title, task_description,
    status, completion_percentage, progress_note
  ) VALUES (
    'f0000000-0000-4000-8000-000000000099'::uuid,
    'd0000000-0000-4000-8000-000000000001'::uuid,
    test_uid,
    '10000000-0000-4000-8000-000000000009'::uuid,  -- Arjun's people.id
    'member',
    'Frontend dashboard UI',
    'Build the React dashboard with charts, filters, and export. Must work on mobile for creator clients.',
    'in_progress', 55,
    'Core chart components done. Working on mobile responsiveness.'
  ) ON CONFLICT (id) DO NOTHING;

  -- 5. Also add to Q2 Brand Campaign project (project d0000000-...002)
  INSERT INTO public.project_members (
    id, project_id, profile_id, person_id,
    role, task_title, task_description,
    status, completion_percentage, progress_note
  ) VALUES (
    'f0000000-0000-4000-8000-000000000098'::uuid,
    'd0000000-0000-4000-8000-000000000002'::uuid,
    test_uid,
    '10000000-0000-4000-8000-000000000009'::uuid,
    'member',
    'Analytics tracking setup',
    'Instrument campaign links and set up UTM tracking across all 3 platforms for the IndiGo campaign.',
    'not_started', 0,
    null
  ) ON CONFLICT (id) DO NOTHING;

END $$;