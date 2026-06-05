-- Slack analytics persistence layer
--
-- The slack-sync edge function reads SLACK_BOT_TOKEN from Supabase secrets
-- and populates these tables. No OAuth redirect flow needed — token is
-- injected directly by the admin.
--
-- Tables:
--   1. connector_slack_workspace       — workspace metadata (one row per startup)
--   2. connector_data_slack_channels   — channel roster
--   3. connector_data_slack_channel_stats — daily aggregates per channel
--   4. connector_data_slack_users      — user roster
--   5. connector_data_slack_user_stats — daily per-user activity
--
-- Access pattern: any authenticated user can SELECT; only founders /
-- social media leads (or service role) can write.

-- ─────────────────────────────────────────────────────────────
-- 1. Workspace metadata
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.connector_slack_workspace (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id       uuid        NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  workspace_id     text        NOT NULL,
  workspace_name   text,
  workspace_domain text,
  team_icon_url    text,
  member_count_total int,
  synced_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (startup_id)
);

ALTER TABLE public.connector_slack_workspace ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "slack_workspace_select" ON public.connector_slack_workspace;
CREATE POLICY "slack_workspace_select" ON public.connector_slack_workspace
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "slack_workspace_write" ON public.connector_slack_workspace;
CREATE POLICY "slack_workspace_write" ON public.connector_slack_workspace
  FOR ALL USING (public.is_social_media_lead(auth.uid()) OR public.is_founder(auth.uid()));

-- ─────────────────────────────────────────────────────────────
-- 2. Channel roster
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.connector_data_slack_channels (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id        uuid        NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  channel_id        text        NOT NULL,
  channel_name      text,
  is_private        boolean     NOT NULL DEFAULT false,
  is_archived       boolean     NOT NULL DEFAULT false,
  member_count      int,
  topic             text,
  purpose           text,
  created_at_source timestamptz,
  synced_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (startup_id, channel_id)
);

CREATE INDEX IF NOT EXISTS slack_channels_startup_idx
  ON public.connector_data_slack_channels (startup_id);

ALTER TABLE public.connector_data_slack_channels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "slack_channels_select" ON public.connector_data_slack_channels;
CREATE POLICY "slack_channels_select" ON public.connector_data_slack_channels
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "slack_channels_write" ON public.connector_data_slack_channels;
CREATE POLICY "slack_channels_write" ON public.connector_data_slack_channels
  FOR ALL USING (public.is_social_media_lead(auth.uid()) OR public.is_founder(auth.uid()));

-- ─────────────────────────────────────────────────────────────
-- 3. Daily channel stats
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.connector_data_slack_channel_stats (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id      uuid        NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  channel_id      text        NOT NULL,
  channel_name    text,
  stat_date       date        NOT NULL,
  message_count   int         NOT NULL DEFAULT 0,
  active_users    int         NOT NULL DEFAULT 0,   -- distinct posters
  reactions_total int         NOT NULL DEFAULT 0,
  replies_total   int         NOT NULL DEFAULT 0,
  files_shared    int         NOT NULL DEFAULT 0,
  peak_hour       int,                              -- 0-23 UTC
  synced_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (startup_id, channel_id, stat_date)
);

CREATE INDEX IF NOT EXISTS slack_channel_stats_startup_date_idx
  ON public.connector_data_slack_channel_stats (startup_id, stat_date DESC);

ALTER TABLE public.connector_data_slack_channel_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "slack_channel_stats_select" ON public.connector_data_slack_channel_stats;
CREATE POLICY "slack_channel_stats_select" ON public.connector_data_slack_channel_stats
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "slack_channel_stats_write" ON public.connector_data_slack_channel_stats;
CREATE POLICY "slack_channel_stats_write" ON public.connector_data_slack_channel_stats
  FOR ALL USING (public.is_social_media_lead(auth.uid()) OR public.is_founder(auth.uid()));

-- ─────────────────────────────────────────────────────────────
-- 4. User roster
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.connector_data_slack_users (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id     uuid        NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  user_id_source text        NOT NULL,
  display_name   text,
  real_name      text,
  title          text,
  is_bot         boolean     NOT NULL DEFAULT false,
  is_admin       boolean     NOT NULL DEFAULT false,
  avatar_url     text,
  synced_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (startup_id, user_id_source)
);

CREATE INDEX IF NOT EXISTS slack_users_startup_idx
  ON public.connector_data_slack_users (startup_id);

ALTER TABLE public.connector_data_slack_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "slack_users_select" ON public.connector_data_slack_users;
CREATE POLICY "slack_users_select" ON public.connector_data_slack_users
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "slack_users_write" ON public.connector_data_slack_users;
CREATE POLICY "slack_users_write" ON public.connector_data_slack_users
  FOR ALL USING (public.is_social_media_lead(auth.uid()) OR public.is_founder(auth.uid()));

-- ─────────────────────────────────────────────────────────────
-- 5. Daily user stats
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.connector_data_slack_user_stats (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id      uuid        NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  user_id_source  text        NOT NULL,
  display_name    text,
  stat_date       date        NOT NULL,
  messages_sent   int         NOT NULL DEFAULT 0,
  reactions_given int         NOT NULL DEFAULT 0,
  replies_sent    int         NOT NULL DEFAULT 0,
  synced_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (startup_id, user_id_source, stat_date)
);

CREATE INDEX IF NOT EXISTS slack_user_stats_startup_date_idx
  ON public.connector_data_slack_user_stats (startup_id, stat_date DESC);

ALTER TABLE public.connector_data_slack_user_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "slack_user_stats_select" ON public.connector_data_slack_user_stats;
CREATE POLICY "slack_user_stats_select" ON public.connector_data_slack_user_stats
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "slack_user_stats_write" ON public.connector_data_slack_user_stats;
CREATE POLICY "slack_user_stats_write" ON public.connector_data_slack_user_stats
  FOR ALL USING (public.is_social_media_lead(auth.uid()) OR public.is_founder(auth.uid()));
