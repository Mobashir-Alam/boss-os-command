-- Email OTP as a second factor.
--
-- Pattern: after a normal email+password sign-in, if profiles.mfa_required is
-- true, the AuthGuard routes the user to /verify. The verify page calls
-- send-mfa-code (which generates a 6-digit code, hashes it, stores it,
-- and emails it). User enters the code; verify-mfa-code marks it used.
-- Frontend then sets a sessionStorage flag so AuthGuard lets them through
-- for the remainder of the browser session.
--
-- First rollout: founder accounts only (this migration sets it on for them).

-- ─────────────────────────────────────────────────────────────
-- 1. Profile flag
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS mfa_required          boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_mfa_verified_at  timestamptz;

-- Roll out to founders first.
UPDATE public.profiles SET mfa_required = true WHERE role = 'founder';

-- ─────────────────────────────────────────────────────────────
-- 2. mfa_codes table
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.mfa_codes (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_hash   text        NOT NULL,
  expires_at  timestamptz NOT NULL,
  used_at     timestamptz,
  attempts    int         NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mfa_codes_user_idx ON public.mfa_codes (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS mfa_codes_active_idx
  ON public.mfa_codes (user_id, used_at, expires_at);

ALTER TABLE public.mfa_codes ENABLE ROW LEVEL SECURITY;

-- The Edge Functions use the service role and bypass RLS. This policy is
-- here as a safety net so the anon key can never read codes — only mark
-- them used through the controlled function.
DROP POLICY IF EXISTS "mfa_codes_no_client_select" ON public.mfa_codes;
CREATE POLICY "mfa_codes_no_client_select" ON public.mfa_codes
  FOR SELECT USING (false);

DROP POLICY IF EXISTS "mfa_codes_no_client_write" ON public.mfa_codes;
CREATE POLICY "mfa_codes_no_client_write" ON public.mfa_codes
  FOR ALL USING (false);

-- ─────────────────────────────────────────────────────────────
-- 3. Cleanup: drop expired codes nightly (small housekeeping)
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.purge_expired_mfa_codes()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.mfa_codes
  WHERE expires_at < now() - interval '1 day';
$$;
