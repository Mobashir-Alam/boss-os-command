-- Phase 1: Real Nasheedio data import
--
-- Goals:
--   1. Add profiles.github_username column (later filled for identity mapping)
--   2. Add 'finance' department to startups (Dilshad has no home today)
--   3. Insert 40+ real Nasheedio people (skipping incomplete "raiyan" row)
--   4. Designate real department leads
--   5. Wire user_roles entries for founder + functional_heads
--
-- Idempotent: re-running won't duplicate. Existing auth accounts (matched
-- by email) are detected and only profile/people fields refresh — no
-- password changes for users who already exist.
--
-- Default password for NEW accounts: 'Welcome2026!'
-- Placeholder emails (login disabled): for people with no email in CSV

-- ─────────────────────────────────────────────────────────────
-- 1. profiles.github_username
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS github_username text;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_github_username_unique
  ON public.profiles (github_username)
  WHERE github_username IS NOT NULL;

-- ─────────────────────────────────────────────────────────────
-- 2. Add 'finance' department to every startup that doesn't have it
-- ─────────────────────────────────────────────────────────────

INSERT INTO public.startup_departments (
  startup_id, department_key, name, status, headcount, summary
)
SELECT
  s.id,
  'finance',
  'Finance',
  'good',
  0,
  'Financial planning, budgeting, payroll, vendor payments, statutory compliance.'
FROM public.startups s
WHERE NOT EXISTS (
  SELECT 1 FROM public.startup_departments sd
  WHERE sd.startup_id = s.id AND sd.department_key = 'finance'
);

-- ─────────────────────────────────────────────────────────────
-- 3. Insert real Nasheedio people
-- ─────────────────────────────────────────────────────────────

DO $$
DECLARE
  m RECORD;
  v_uid uuid;
  v_pw_hash text := crypt('Welcome2026!', gen_salt('bf'));
BEGIN
  FOR m IN
    SELECT * FROM (VALUES
      -- (uid                                              , email                                          , full_name                  , role               , department                  , role_title                                              , employment_type , joining_date       , is_active)
      ('f2000000-0000-4000-8000-000000000001'::uuid, 'adil@nasheedio.com'                       , 'Sheikh Adil Meraj'        , 'founder'        , NULL                         , 'CEO'                                                  , 'full_time'    , DATE '2023-01-01' , true),
      ('f2000000-0000-4000-8000-000000000002'::uuid, 'hidayat@nasheedio.com'                    , 'Md Hidayat Rasool'        , 'functional_head', 'content_management'         , 'Content Management Team Lead'                          , 'full_time'    , DATE '2024-03-10' , true),
      ('f2000000-0000-4000-8000-000000000003'::uuid, 'tanziamehnaz.gurucool@gmail.com'          , 'Tanzia Mehnaz'            , 'team_member'    , 'social_media'               , 'Manager at Nasheedio Beats'                            , 'full_time'    , DATE '2024-07-01' , true),
      ('f2000000-0000-4000-8000-000000000004'::uuid, 'amanullah.digitaleon@gmail.com'           , 'Amanullah'                , 'team_member'    , 'tech'                       , 'Flutter Developer & Manager (Founders Office)'         , 'full_time'    , DATE '2024-09-16' , true),
      ('f2000000-0000-4000-8000-000000000005'::uuid, 'ammad.nasheedio@gmail.com'                , 'Ammadul Islam Farooqi'    , 'team_member'    , 'content_management'         , 'Content Manager + Manager to Founders Office'          , 'full_time'    , DATE '2024-10-01' , true),
      ('f2000000-0000-4000-8000-000000000006'::uuid, 'sidrah.nasheedio@gmail.com'               , 'Sidrah Noor'              , 'team_member'    , 'social_media'               , 'Brand Associate'                                       , 'full_time'    , DATE '2024-10-01' , true),
      ('f2000000-0000-4000-8000-000000000007'::uuid, 'shadan.nasheedio@gmail.com'               , 'Shadan Siddique'          , 'functional_head', 'studio'                     , 'Studio Lead'                                          , 'full_time'    , DATE '2024-11-10' , true),
      ('f2000000-0000-4000-8000-000000000008'::uuid, 'zeya.nasheedio@gmail.com'                 , 'Zeyaur Rahman Khan'       , 'team_member'    , 'video_production_editing'   , 'Video Editor'                                          , 'full_time'    , DATE '2024-12-05' , true),
      ('f2000000-0000-4000-8000-000000000009'::uuid, 'owais@nasheedio.local'                    , 'Owais'                    , 'team_member'    , 'studio'                     , 'Freelancer'                                            , 'freelancer'   , DATE '2024-12-10' , true),
      ('f2000000-0000-4000-8000-000000000010'::uuid, 'hasan.nasheedio@gmail.com'                , 'Hasan Ali'                , 'functional_head', 'creators_brands_outreach'   , 'Head of Creator Partnerships'                         , 'full_time'    , DATE '2024-12-12' , true),
      ('f2000000-0000-4000-8000-000000000011'::uuid, 'mubdi.nasheedio@gmail.com'                , 'Mubdi Ali'                , 'team_member'    , 'social_media'               , 'Social Media Manager (Nasheedio Bangla)'              , 'part_time'    , DATE '2024-12-18' , true),
      ('f2000000-0000-4000-8000-000000000012'::uuid, 'rashid.nasheedio@gmail.com'               , 'Rashid Imran'             , 'team_member'    , 'content_management'         , 'Content Manager'                                       , 'full_time'    , DATE '2025-01-01' , true),
      ('f2000000-0000-4000-8000-000000000013'::uuid, 'tubashamshad.nasheedio@gmail.com'         , 'Tuba Shamshad'            , 'functional_head', 'hr'                         , 'HR Manager'                                            , 'full_time'    , DATE '2025-01-02' , true),
      ('f2000000-0000-4000-8000-000000000014'::uuid, 'immu.nasheedio@gmail.com'                 , 'Imamuddin'                , 'team_member'    , 'social_media'               , 'Video Editor'                                          , 'part_time'    , DATE '2025-02-12' , true),
      ('f2000000-0000-4000-8000-000000000015'::uuid, 'omraghav.nasheedio@gmail.com'             , 'Om Raghav'                , 'team_member'    , 'studio'                     , 'Music Producer'                                        , 'full_time'    , DATE '2025-02-15' , true),
      ('f2000000-0000-4000-8000-000000000016'::uuid, 'saika.nasheedio@gmail.com'                , 'Saika Parveen'            , 'team_member'    , 'content_management'         , 'Content Manager'                                       , 'full_time'    , DATE '2025-03-01' , true),
      ('f2000000-0000-4000-8000-000000000017'::uuid, 'omar.digitaleon@gmail.com'                , 'Muhammad Omar'            , 'team_member'    , 'tech'                       , 'Product Lead'                                          , 'full_time'    , DATE '2025-04-01' , true),
      ('f2000000-0000-4000-8000-000000000018'::uuid, 'anas.digitaleon@gmail.com'                , 'Mohammad Anas'            , 'functional_head', 'tech'                       , 'Tech Lead'                                             , 'full_time'    , DATE '2025-04-01' , true),
      ('f2000000-0000-4000-8000-000000000019'::uuid, 'shahrukh.digitaleon@gmail.com'            , 'Shahrukh Khan'            , 'team_member'    , 'tech'                       , 'Senior Frontend Engineer'                             , 'full_time'    , DATE '2025-04-01' , true),
      ('f2000000-0000-4000-8000-000000000020'::uuid, 'faisal.nasheedio@gmail.com'               , 'Faisal Dilshad'           , 'team_member'    , 'tech'                       , 'Frontend Developer'                                    , 'full_time'    , DATE '2025-04-01' , true),
      ('f2000000-0000-4000-8000-000000000021'::uuid, 'zeenat.nasheedio@gmail.com'               , 'Jinat Shaikh'             , 'team_member'    , 'content_management'         , 'Content Associate'                                     , 'full_time'    , DATE '2025-05-01' , true),
      ('f2000000-0000-4000-8000-000000000022'::uuid, 'fatima.nasheedio@gmail.com'               , 'Fatima Faheem'            , 'team_member'    , 'creators_brands_outreach'   , 'HR (Talent Acquisition)'                              , 'full_time'    , DATE '2025-08-01' , true),
      ('f2000000-0000-4000-8000-000000000023'::uuid, 'ahmad.nasheedio@gmail.com'                , 'Mohd. Ahmad'              , 'team_member'    , 'tech'                       , 'Frontend Developer'                                    , 'full_time'    , DATE '2025-09-01' , true),
      ('f2000000-0000-4000-8000-000000000024'::uuid, 'quasarnasheedio@gmail.com'                , 'Qausar Alam'              , 'team_member'    , 'graphic_designing'          , 'Graphic Designer'                                      , 'full_time'    , DATE '2025-10-05' , true),
      ('f2000000-0000-4000-8000-000000000025'::uuid, 'dilshadkhan.digitaleon@gmail.com'         , 'Dilshad Khan'             , 'functional_head', 'finance'                    , 'Finance Manager'                                       , 'full_time'    , DATE '2025-05-01' , true),
      ('f2000000-0000-4000-8000-000000000026'::uuid, 'aninda.digitaleon@gmail.com'              , 'Aninda Das'               , 'team_member'    , 'graphic_designing'          , 'Graphic Designer'                                      , 'full_time'    , DATE '2025-07-22' , true),
      ('f2000000-0000-4000-8000-000000000027'::uuid, 'sjamil.nasheedio@gmail.com'               , 'Sharba Jamil'             , 'team_member'    , 'creators_brands_outreach'   , 'Content and Creator Associate'                        , 'part_time'    , DATE '2025-10-27' , true),
      ('f2000000-0000-4000-8000-000000000028'::uuid, 'bushra.nasheedio@gmail.com'               , 'Bushra Ashraf'            , 'team_member'    , 'content_management'         , 'Junior Content Manager (Content & Finance)'           , 'full_time'    , DATE '2025-11-01' , true),
      ('f2000000-0000-4000-8000-000000000029'::uuid, 'aktiaanzum.nasheedio@gmail.com'           , 'Aktia Anzum Anika'        , 'team_member'    , 'social_media'               , 'TikTok Accounts Manager & Content Team Consultant'     , 'freelancer'   , DATE '2025-12-02' , true),
      ('f2000000-0000-4000-8000-000000000030'::uuid, 'sufiyan.nasheedio@gmail.com'              , 'Sufiyan Ali'              , 'team_member'    , 'office_management'          , 'Junior Digital Associate'                              , 'full_time'    , DATE '2026-01-01' , true),
      ('f2000000-0000-4000-8000-000000000031'::uuid, 'fikri.nasheedio@gmail.com'                , 'Fikri Padilah'            , 'team_member'    , 'social_media'               , 'Talent & Social Media Manager (Indonesia)'            , 'part_time'    , DATE '2026-01-02' , true),
      ('f2000000-0000-4000-8000-000000000032'::uuid, 'nafeha.nasheedio@gmail.com'               , 'Nafeha Nayeem'            , 'team_member'    , 'graphic_designing'          , 'UI/UX Designer'                                        , 'full_time'    , DATE '2026-01-12' , true),
      ('f2000000-0000-4000-8000-000000000033'::uuid, 'ayan.nasheedios@gmail.com'                , 'Mohd Ayan Ansari'         , 'team_member'    , 'video_production_editing'   , 'Videographer & Video Editor'                          , 'full_time'    , DATE '2026-04-08' , true),
      -- Interns
      ('f2000000-0000-4000-8000-000000000034'::uuid, 'saina.nasheedio@gmail.com'                , 'Saina'                    , 'team_member'    , 'content_management'         , 'Junior Content Manager (Intern)'                       , 'intern'       , DATE '2025-01-07' , true),
      ('f2000000-0000-4000-8000-000000000035'::uuid, 'nazia.nasheedio@gmail.com'                , 'Nazia Nawaz'              , 'team_member'    , 'content_management'         , 'Junior Content Manager Intern (Bangla)'                , 'intern'       , DATE '2025-12-03' , true),
      ('f2000000-0000-4000-8000-000000000036'::uuid, 'mobashir.nasheedio@gmail.com'             , 'Mobashir Alam'            , 'team_member'    , 'tech'                       , 'Software Developer Trainee'                            , 'intern'       , DATE '2026-01-23' , true),
      ('f2000000-0000-4000-8000-000000000037'::uuid, 'srayansh.nasheedio@gmail.com'             , 'Srayansh Gupta'           , 'team_member'    , 'tech'                       , 'Full Stack Flutter Developer Intern'                  , 'intern'       , DATE '2026-02-05' , true),
      ('f2000000-0000-4000-8000-000000000038'::uuid, 'omamaaziz.nasheedio@gmail.com'            , 'Omamah Aziz'              , 'team_member'    , 'social_media'               , 'Social Media Intern'                                   , 'intern'       , DATE '2026-02-05' , true),
      -- Humaira's internship ended 2026-05-05; mark inactive
      ('f2000000-0000-4000-8000-000000000039'::uuid, 'humaira.nasheedio@gmail.com'              , 'Humaira Talat'            , 'team_member'    , 'social_media'               , 'Social Media Intern'                                   , 'intern'       , DATE '2026-02-05' , false),
      ('f2000000-0000-4000-8000-000000000040'::uuid, 'summaiyya.nasheedio@gmail.com'            , 'Summaiyya Shamshad'       , 'team_member'    , 'social_media'               , 'Social Media Intern'                                   , 'intern'       , DATE '2026-02-05' , true),
      ('f2000000-0000-4000-8000-000000000041'::uuid, 'arshadjamal@nasheedio.local'              , 'Arshad Jamal'             , 'team_member'    , 'tech'                       , 'Software Developer Intern'                             , 'intern'       , DATE '2026-05-12' , true)
    ) AS t(uid, email, full_name, role, department, role_title, employment_type, joining_date, is_active)
  LOOP
    -- Find or create auth user. If email already exists (e.g. you, Mobashir),
    -- we reuse the existing UUID and never overwrite the password.
    SELECT id INTO v_uid FROM auth.users WHERE email = m.email;
    IF v_uid IS NULL THEN
      v_uid := m.uid;
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
        v_uid,
        '00000000-0000-0000-0000-000000000000',
        'authenticated', 'authenticated',
        m.email,
        v_pw_hash,
        now(),
        '', '', '', '', '',
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{}'::jsonb,
        false, now(), now(),
        null, '', '',
        0, false
      );

      INSERT INTO auth.identities (
        id, user_id, provider_id,
        identity_data, provider,
        last_sign_in_at, created_at, updated_at
      ) VALUES (
        v_uid, v_uid, m.email,
        jsonb_build_object('sub', v_uid::text, 'email', m.email),
        'email',
        now(), now(), now()
      );
    END IF;

    -- Upsert profile
    INSERT INTO public.profiles (id, email, full_name, role, department)
    VALUES (v_uid, m.email, m.full_name, m.role::public.app_role, m.department)
    ON CONFLICT (id) DO UPDATE SET
      email      = EXCLUDED.email,
      full_name  = EXCLUDED.full_name,
      role       = EXCLUDED.role,
      department = EXCLUDED.department,
      updated_at = now();

    -- Upsert people row (used by HR directory, payroll, etc.)
    INSERT INTO public.people (
      id, full_name, role, department,
      linked_startups, employment_type,
      salary, cost_to_company, joining_date, status,
      kpi_score, productivity_score, weekly_output_score,
      hours_committed, hours_delivered,
      tasks_assigned, tasks_completed
    ) VALUES (
      v_uid, m.full_name, m.role_title,
      CASE m.department
        WHEN 'social_media'             THEN 'Social Media'
        WHEN 'video_production_editing' THEN 'Video Production / Editing'
        WHEN 'content_management'       THEN 'Content Management'
        WHEN 'studio'                   THEN 'Studio'
        WHEN 'tech'                     THEN 'Tech'
        WHEN 'creators_brands_outreach' THEN 'Creators / Brands Outreach'
        WHEN 'hr'                       THEN 'HR'
        WHEN 'graphic_designing'        THEN 'Graphic Designing'
        WHEN 'office_management'        THEN 'Office Management'
        WHEN 'finance'                  THEN 'Finance'
        ELSE 'Other'
      END,
      ARRAY['nasheedio'],
      m.employment_type,
      0, 0,                                       -- salary 0 — HR fills in
      m.joining_date,
      CASE WHEN m.is_active THEN 'active' ELSE 'inactive' END,
      80, 80, 80,                                 -- placeholder KPI numbers
      40, 40,
      0, 0
    )
    ON CONFLICT (id) DO UPDATE SET
      full_name        = EXCLUDED.full_name,
      role             = EXCLUDED.role,
      department       = EXCLUDED.department,
      employment_type  = EXCLUDED.employment_type,
      joining_date     = EXCLUDED.joining_date,
      status           = EXCLUDED.status,
      updated_at       = now();

    -- user_roles entries for founder + functional_heads
    -- (the has_role() check uses this table)
    IF m.role IN ('founder', 'functional_head') THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (v_uid, m.role::public.app_role)
      ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 4. Designate real department leads on startup_departments
-- ─────────────────────────────────────────────────────────────

DO $$
DECLARE
  s_id uuid;
BEGIN
  SELECT id INTO s_id FROM public.startups WHERE slug = 'nasheedio';
  IF s_id IS NULL THEN
    RAISE NOTICE 'No nasheedio startup found, skipping dept lead assignment';
    RETURN;
  END IF;

  -- Tech: Anas
  UPDATE public.startup_departments
     SET lead_person_id = (SELECT id FROM public.profiles WHERE email = 'anas.digitaleon@gmail.com'),
         updated_at = now()
   WHERE startup_id = s_id AND department_key = 'tech';

  -- HR: Tuba
  UPDATE public.startup_departments
     SET lead_person_id = (SELECT id FROM public.profiles WHERE email = 'tubashamshad.nasheedio@gmail.com'),
         updated_at = now()
   WHERE startup_id = s_id AND department_key = 'hr';

  -- Finance: Dilshad
  UPDATE public.startup_departments
     SET lead_person_id = (SELECT id FROM public.profiles WHERE email = 'dilshadkhan.digitaleon@gmail.com'),
         updated_at = now()
   WHERE startup_id = s_id AND department_key = 'finance';

  -- Content: Hidayat
  UPDATE public.startup_departments
     SET lead_person_id = (SELECT id FROM public.profiles WHERE email = 'hidayat@nasheedio.com'),
         updated_at = now()
   WHERE startup_id = s_id AND department_key = 'content_management';

  -- Studio: Shadan
  UPDATE public.startup_departments
     SET lead_person_id = (SELECT id FROM public.profiles WHERE email = 'shadan.nasheedio@gmail.com'),
         updated_at = now()
   WHERE startup_id = s_id AND department_key = 'studio';

  -- Creators / Brands Outreach: Hasan
  UPDATE public.startup_departments
     SET lead_person_id = (SELECT id FROM public.profiles WHERE email = 'hasan.nasheedio@gmail.com'),
         updated_at = now()
   WHERE startup_id = s_id AND department_key = 'creators_brands_outreach';
END $$;

-- ─────────────────────────────────────────────────────────────
-- 5. Refresh per-department headcount based on real people
--    (counts active people in profiles for each dept on Nasheedio)
-- ─────────────────────────────────────────────────────────────

UPDATE public.startup_departments sd
   SET headcount = (
     SELECT count(*) FROM public.profiles p
      WHERE p.department = sd.department_key
   ),
       updated_at = now()
 WHERE sd.startup_id = (SELECT id FROM public.startups WHERE slug = 'nasheedio');
