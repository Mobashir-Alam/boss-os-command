-- Slack accountability / attendance layer
--
-- Turns the passive Slack analytics into an active accountability system:
--   - Who checked in (first message in the attendance channel)
--   - Who posted a work update (any channel ending in the configured suffix)
--   - Who was active but never checked in (the accountability gap)
--   - Who was absent
--
-- Shifts are dynamic (some day, some night), so:
--   - There is NO "late" judgment — check-in times are recorded raw.
--   - A configurable day-boundary hour keeps night shifts in one row
--     instead of splitting at midnight.

-- ─────────────────────────────────────────────────────────────
-- 1. Monitoring config (one row per startup)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.slack_monitoring_config (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id             uuid        NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  attendance_channel_id  text,                              -- the #attendance channel
  attendance_channel_name text,
  updates_channel_suffix text        NOT NULL DEFAULT 'work-update',  -- match any channel ending in this
  timezone               text        NOT NULL DEFAULT 'Asia/Kolkata', -- IANA tz for local-day bucketing
  day_boundary_hour      int         NOT NULL DEFAULT 6,    -- work-day runs from this local hour → +24h
  is_enabled             boolean     NOT NULL DEFAULT true,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  UNIQUE (startup_id)
);

ALTER TABLE public.slack_monitoring_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "slack_config_select" ON public.slack_monitoring_config;
CREATE POLICY "slack_config_select" ON public.slack_monitoring_config
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "slack_config_write" ON public.slack_monitoring_config;
CREATE POLICY "slack_config_write" ON public.slack_monitoring_config
  FOR ALL USING (public.is_social_media_lead());

-- ─────────────────────────────────────────────────────────────
-- 2. Daily attendance (per person, per work-day)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.slack_daily_attendance (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id      uuid        NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  user_id_source  text        NOT NULL,
  display_name    text,
  work_date       date        NOT NULL,                     -- local work-day after boundary shift
  checked_in      boolean     NOT NULL DEFAULT false,
  check_in_time   timestamptz,                              -- raw UTC of first attendance-channel msg
  posted_update   boolean     NOT NULL DEFAULT false,
  update_time     timestamptz,                              -- raw UTC of first work-update msg
  was_active      boolean     NOT NULL DEFAULT false,       -- any message anywhere
  first_activity  timestamptz,
  last_activity   timestamptz,
  message_count   int         NOT NULL DEFAULT 0,
  synced_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (startup_id, user_id_source, work_date)
);

CREATE INDEX IF NOT EXISTS slack_attendance_startup_date_idx
  ON public.slack_daily_attendance (startup_id, work_date DESC);
CREATE INDEX IF NOT EXISTS slack_attendance_user_idx
  ON public.slack_daily_attendance (startup_id, user_id_source);

ALTER TABLE public.slack_daily_attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "slack_attendance_select" ON public.slack_daily_attendance;
CREATE POLICY "slack_attendance_select" ON public.slack_daily_attendance
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "slack_attendance_write" ON public.slack_daily_attendance;
CREATE POLICY "slack_attendance_write" ON public.slack_daily_attendance
  FOR ALL USING (public.is_social_media_lead());
