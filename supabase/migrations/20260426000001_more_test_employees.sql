-- Three more test employee accounts so we can verify realtime project chat
-- across multiple browser tabs.
-- Logins (all password: Test1234!):
--   priya.test@nasheedio.com   — Priya Singh   (lead on project 1)
--   rahul.test@nasheedio.com   — Rahul Verma   (member on project 1)
--   aisha.test@nasheedio.com   — Aisha Sharma  (member on project 1)
-- All linked to: Creator Analytics Dashboard v2 (d0000000-...001)

DO $$
DECLARE
  test_password text := 'Test1234!';

  priya_uid uuid := 'f0000000-0000-4000-8000-000000000010'::uuid;
  rahul_uid uuid := 'f0000000-0000-4000-8000-000000000011'::uuid;
  aisha_uid uuid := 'f0000000-0000-4000-8000-000000000012'::uuid;

  priya_email text := 'priya.test@nasheedio.com';
  rahul_email text := 'rahul.test@nasheedio.com';
  aisha_email text := 'aisha.test@nasheedio.com';

  project_id uuid := 'd0000000-0000-4000-8000-000000000001'::uuid;
BEGIN

  -- ── 1. Auth users ────────────────────────────────────────
  INSERT INTO auth.users (
    id, instance_id, aud, role,
    email, encrypted_password, email_confirmed_at,
    confirmation_token, recovery_token,
    email_change_token_new, email_change, email_change_token_current,
    raw_app_meta_data, raw_user_meta_data,
    is_super_admin, created_at, updated_at,
    phone, phone_change, phone_change_token,
    email_change_confirm_status, is_sso_user
  )
  VALUES
    (priya_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     priya_email, crypt(test_password, gen_salt('bf')), now(),
     '', '', '', '', '',
     '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
     false, now(), now(), null, '', '', 0, false),
    (rahul_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     rahul_email, crypt(test_password, gen_salt('bf')), now(),
     '', '', '', '', '',
     '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
     false, now(), now(), null, '', '', 0, false),
    (aisha_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     aisha_email, crypt(test_password, gen_salt('bf')), now(),
     '', '', '', '', '',
     '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
     false, now(), now(), null, '', '', 0, false)
  ON CONFLICT (id) DO NOTHING;

  -- ── 2. Auth identities ───────────────────────────────────
  INSERT INTO auth.identities (
    id, user_id, provider_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  )
  VALUES
    (priya_uid, priya_uid, priya_email,
     jsonb_build_object('sub', priya_uid::text, 'email', priya_email),
     'email', now(), now(), now()),
    (rahul_uid, rahul_uid, rahul_email,
     jsonb_build_object('sub', rahul_uid::text, 'email', rahul_email),
     'email', now(), now(), now()),
    (aisha_uid, aisha_uid, aisha_email,
     jsonb_build_object('sub', aisha_uid::text, 'email', aisha_email),
     'email', now(), now(), now())
  ON CONFLICT (id) DO NOTHING;

  -- ── 3. Profiles ──────────────────────────────────────────
  INSERT INTO public.profiles (id, email, full_name, role, department) VALUES
    (priya_uid, priya_email, 'Priya Singh',  'team_member', 'tech'),
    (rahul_uid, rahul_email, 'Rahul Verma',  'team_member', 'tech'),
    (aisha_uid, aisha_email, 'Aisha Sharma', 'team_member', 'tech')
  ON CONFLICT (id) DO UPDATE SET
    full_name  = EXCLUDED.full_name,
    role       = EXCLUDED.role,
    department = EXCLUDED.department;

  -- ── 4. Project members on Creator Analytics Dashboard v2 ─
  INSERT INTO public.project_members (
    id, project_id, profile_id, person_id,
    role, task_title, task_description,
    status, completion_percentage, progress_note
  ) VALUES
    ('f0000000-0000-4000-8000-000000000110'::uuid, project_id, priya_uid, null,
     'lead', 'Tech lead — coordinate the build',
     'Run weekly check-ins, unblock the team, and own the technical roadmap for the dashboard.',
     'in_progress', 40,
     'Backend API spec finalized. Frontend on track.'),
    ('f0000000-0000-4000-8000-000000000111'::uuid, project_id, rahul_uid, null,
     'member', 'Charts and visualizations',
     'Build the chart components (line, bar, donut) using Recharts and ensure mobile responsiveness.',
     'in_progress', 30,
     'Line and bar charts done. Donut next.'),
    ('f0000000-0000-4000-8000-000000000112'::uuid, project_id, aisha_uid, null,
     'member', 'QA and brand client UAT',
     'Coordinate UAT with 5 priority brand clients and sign off on final dashboard flows.',
     'not_started', 0, null)
  ON CONFLICT (id) DO NOTHING;

END $$;
