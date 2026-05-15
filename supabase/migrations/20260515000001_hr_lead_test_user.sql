-- Test HR Lead account for the upcoming HR UI work.
-- Login: hr.lead@nasheedio.com / HRLead123!
-- Role : functional_head, department = hr
-- Linked: becomes the lead of Nasheedio's HR department.
--
-- Mirrors the pattern in 20260508000001_tech_lead_test_user.sql.

DO $$
DECLARE
  hr_uid      uuid := 'f0000000-0000-4000-8000-000000000020'::uuid;
  hr_email    text := 'hr.lead@nasheedio.com';
  hr_password text := 'HRLead123!';
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
    hr_uid,
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    hr_email,
    crypt(hr_password, gen_salt('bf')),
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
    hr_uid, hr_uid, hr_email,
    jsonb_build_object('sub', hr_uid::text, 'email', hr_email),
    'email',
    now(), now(), now()
  ) ON CONFLICT (id) DO NOTHING;

  -- 3. Profile — functional_head of HR
  INSERT INTO public.profiles (id, email, full_name, role, department)
  VALUES (hr_uid, hr_email, 'HR Lead 01', 'functional_head', 'hr')
  ON CONFLICT (id) DO UPDATE SET
    full_name  = EXCLUDED.full_name,
    role       = EXCLUDED.role,
    department = EXCLUDED.department;

  -- 4. user_roles row (for has_role() checks)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (hr_uid, 'functional_head')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- 5. Matching people row so HR shows up in directory views
  INSERT INTO public.people (
    id, full_name, role, department,
    linked_startups, employment_type,
    salary, cost_to_company, joining_date, status,
    kpi_score, productivity_score, weekly_output_score,
    hours_committed, hours_delivered,
    tasks_assigned, tasks_completed
  ) VALUES (
    hr_uid, 'HR Lead 01', 'Head of HR', 'HR',
    ARRAY['nasheedio'], 'full_time',
    150000, 150000, DATE '2024-04-01', 'active',
    87, 84, 86,
    40, 38,
    10, 9
  ) ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role      = EXCLUDED.role,
    updated_at = now();

  -- 6. Mark this user as the lead of Nasheedio's HR startup_department.
  --    The startup_departments seed pre-created an HR row with lead = NULL.
  UPDATE public.startup_departments sd
     SET lead_person_id = hr_uid,
         updated_at = now()
    FROM public.startups s
   WHERE sd.startup_id = s.id
     AND s.slug = 'nasheedio'
     AND sd.department_key = 'hr';

END $$;
