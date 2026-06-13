ALTER TABLE public.slack_daily_attendance
  ADD COLUMN IF NOT EXISTS check_in_source text,
  ADD COLUMN IF NOT EXISTS check_in_claim_text text,
  ADD COLUMN IF NOT EXISTS check_in_claim_at timestamptz;