-- Seed 7 more tech team members so the assignee picker matches the
-- CEO-displayed headcount of 9.
--
-- Pattern: each member gets an auth.users row + auth.identities row +
-- profiles row + people row. All use the same password (TechTeam123!)
-- and are linked to Nasheedio.
--
-- Existing tech profiles before this migration:
--   - tech.lead@nasheedio.com (Vikram Singh, functional_head)
--   - arjun.test@nasheedio.com (Arjun Mehta, team_member)
-- After this migration: 9 total (2 + 7).

DO $$
DECLARE
  m RECORD;
BEGIN
  FOR m IN
    SELECT * FROM (VALUES
      ('f1000000-0000-4000-8000-000000000001'::uuid, 'kavya.reddy@nasheedio.com',  'Kavya Reddy',   'Backend Engineer'),
      ('f1000000-0000-4000-8000-000000000002'::uuid, 'rohan.joshi@nasheedio.com',  'Rohan Joshi',   'Frontend Engineer'),
      ('f1000000-0000-4000-8000-000000000003'::uuid, 'diya.patel@nasheedio.com',   'Diya Patel',    'DevOps Engineer'),
      ('f1000000-0000-4000-8000-000000000004'::uuid, 'sahil.khan@nasheedio.com',   'Sahil Khan',    'Mobile Engineer'),
      ('f1000000-0000-4000-8000-000000000005'::uuid, 'ananya.iyer@nasheedio.com',  'Ananya Iyer',   'Data Engineer'),
      ('f1000000-0000-4000-8000-000000000006'::uuid, 'ishaan.verma@nasheedio.com', 'Ishaan Verma',  'QA Engineer'),
      ('f1000000-0000-4000-8000-000000000007'::uuid, 'tanvi.bhatia@nasheedio.com', 'Tanvi Bhatia',  'Product Engineer')
    ) AS t(uid, email, full_name, role_title)
  LOOP
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
      m.uid,
      '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated',
      m.email,
      crypt('TechTeam123!', gen_salt('bf')),
      now(),
      '', '', '', '', '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      false, now(), now(),
      null, '', '',
      0, false
    ) ON CONFLICT (id) DO NOTHING;

    -- 2. Auth identity
    INSERT INTO auth.identities (
      id, user_id, provider_id,
      identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      m.uid, m.uid, m.email,
      jsonb_build_object('sub', m.uid::text, 'email', m.email),
      'email',
      now(), now(), now()
    ) ON CONFLICT (id) DO NOTHING;

    -- 3. Profile — team_member in tech
    INSERT INTO public.profiles (id, email, full_name, role, department)
    VALUES (m.uid, m.email, m.full_name, 'team_member', 'tech')
    ON CONFLICT (id) DO UPDATE SET
      full_name  = EXCLUDED.full_name,
      role       = EXCLUDED.role,
      department = EXCLUDED.department;

    -- 4. People row (HR record) — links to Nasheedio
    INSERT INTO public.people (
      id, full_name, role, department,
      linked_startups, employment_type,
      salary, cost_to_company, joining_date, status,
      kpi_score, productivity_score, weekly_output_score,
      hours_committed, hours_delivered,
      tasks_assigned, tasks_completed
    ) VALUES (
      m.uid, m.full_name, m.role_title, 'Tech',
      ARRAY['nasheedio'], 'full_time',
      85000, 85000, DATE '2024-06-01', 'active',
      80, 78, 79,
      40, 38,
      5, 4
    ) ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      role      = EXCLUDED.role,
      updated_at = now();
  END LOOP;
END $$;
