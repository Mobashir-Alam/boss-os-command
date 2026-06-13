
CREATE TABLE IF NOT EXISTS public.slack_monitoring_config (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id             uuid        NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  attendance_channel_id  text,
  attendance_channel_name text,
  updates_channel_suffix text        NOT NULL DEFAULT 'work-update',
  timezone               text        NOT NULL DEFAULT 'Asia/Kolkata',
  day_boundary_hour      int         NOT NULL DEFAULT 6,
  is_enabled             boolean     NOT NULL DEFAULT true,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  UNIQUE (startup_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.slack_monitoring_config TO authenticated;
GRANT ALL ON public.slack_monitoring_config TO service_role;

ALTER TABLE public.slack_monitoring_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "slack_config_select" ON public.slack_monitoring_config;
CREATE POLICY "slack_config_select" ON public.slack_monitoring_config
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "slack_config_write" ON public.slack_monitoring_config;
CREATE POLICY "slack_config_write" ON public.slack_monitoring_config
  FOR ALL USING (public.is_social_media_lead());

CREATE TABLE IF NOT EXISTS public.slack_daily_attendance (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id      uuid        NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  user_id_source  text        NOT NULL,
  display_name    text,
  work_date       date        NOT NULL,
  checked_in      boolean     NOT NULL DEFAULT false,
  check_in_time   timestamptz,
  posted_update   boolean     NOT NULL DEFAULT false,
  update_time     timestamptz,
  was_active      boolean     NOT NULL DEFAULT false,
  first_activity  timestamptz,
  last_activity   timestamptz,
  message_count   int         NOT NULL DEFAULT 0,
  synced_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (startup_id, user_id_source, work_date)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.slack_daily_attendance TO authenticated;
GRANT ALL ON public.slack_daily_attendance TO service_role;

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
