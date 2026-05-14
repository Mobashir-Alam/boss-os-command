-- Add a separate "notification_email" on profiles so MFA codes (and any
-- future transactional emails) can route to a real inbox even when the
-- login email is a placeholder.
--
-- Login email lives in auth.users.email and stays unchanged.
-- send-mfa-code now prefers profiles.notification_email when set, falling
-- back to auth.users.email otherwise.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notification_email text
    CHECK (notification_email IS NULL OR notification_email ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$');

-- Map the test founder login → real Gmail for OTPs
UPDATE public.profiles
   SET notification_email = 'mobashir7838@gmail.com'
 WHERE email = 'founder@test.com';
