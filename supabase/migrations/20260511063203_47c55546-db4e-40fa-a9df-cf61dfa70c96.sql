DO $$
DECLARE
  lead_uid      uuid := 'f0000000-0000-4000-8000-000000000010'::uuid;
  lead_email    text := 'tech.lead@nasheedio.com';
  lead_password text := 'TechLead123!';
BEGIN

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
    lead_uid,
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    lead_email,
    crypt(lead_password, gen_salt('bf')),
    now(),
    '', '', '', '', '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    false, now(), now(),
    null, '', '',
    0, false
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO auth.identities (
    id, user_id, provider_id,
    identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    lead_uid,
    lead_uid,
    lead_email,
    jsonb_build_object('sub', lead_uid::text, 'email', lead_email),
    'email',
    now(), now(), now()
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.profiles (id, email, full_name, role, department)
  VALUES (lead_uid, lead_email, 'Vikram Singh', 'functional_head', 'tech')
  ON CONFLICT (id) DO UPDATE SET
    full_name  = EXCLUDED.full_name,
    role       = EXCLUDED.role,
    department = EXCLUDED.department;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (lead_uid, 'functional_head')
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.project_members (
    id, project_id, profile_id, person_id, role
  ) VALUES (
    'f0000000-0000-4000-8000-000000000089'::uuid,
    'd0000000-0000-4000-8000-000000000001'::uuid,
    lead_uid,
    '10000000-0000-4000-8000-000000000026'::uuid,
    'lead'
  ) ON CONFLICT (id) DO NOTHING;

END $$;