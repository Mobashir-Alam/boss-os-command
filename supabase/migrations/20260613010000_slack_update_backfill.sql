-- Work-update backfill policy.
--
-- When someone posts a single update covering several missed days ("here's my
-- Mon/Tue/Wed work"), the prior gap days — up to this cap — are credited as
-- "caught up" rather than counted as missed. This is a derived view; the raw
-- posted_update day stays literal in slack_daily_attendance. 0 = strict (no
-- backfill).
ALTER TABLE public.slack_monitoring_config
  ADD COLUMN IF NOT EXISTS update_backfill_cap_days int NOT NULL DEFAULT 3;
