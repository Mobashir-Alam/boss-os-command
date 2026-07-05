-- Query-performance indexes for the hottest dashboard read paths.

CREATE INDEX IF NOT EXISTS idx_yt_analytics_video_date
  ON public.connector_data_youtube_video_analytics (video_uuid, date DESC);

CREATE INDEX IF NOT EXISTS idx_github_daily_login_date
  ON public.connector_data_github_daily (github_login, activity_date DESC);

CREATE INDEX IF NOT EXISTS idx_github_daily_date
  ON public.connector_data_github_daily (activity_date DESC);

CREATE INDEX IF NOT EXISTS idx_slack_attendance_date
  ON public.slack_daily_attendance (work_date DESC, startup_id);

CREATE INDEX IF NOT EXISTS idx_slack_attendance_user
  ON public.slack_daily_attendance (user_id_source, work_date DESC);
