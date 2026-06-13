-- Self-reported (bulk) attendance.
--
-- When someone posts attendance for several days at once in the attendance
-- channel ("8th 8-5pm, 9th 7pm-5am, ..."), the slack-sync function uses the
-- AI gateway to resolve the claimed dates and fills those days. Those days are
-- marked as self_reported (distinct from a live same-day check-in) and the
-- source message is kept for audit, so the founder can always see who checked
-- in live vs who backfilled their attendance later.
--
--   check_in_source:
--     'live'          → first message that person posted in the attendance
--                       channel on that work-day (real-time check-in)
--     'self_reported' → filled from a later bulk message claiming this date
--     NULL            → not checked in
ALTER TABLE public.slack_daily_attendance
  ADD COLUMN IF NOT EXISTS check_in_source   text,
  ADD COLUMN IF NOT EXISTS check_in_claim_text text,
  ADD COLUMN IF NOT EXISTS check_in_claim_at timestamptz;  -- when the bulk message was posted
